import { randomUUID } from "node:crypto";
import { statfs } from "node:fs/promises";
import { Prisma, type GovColeta } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { consultarGov, consultarDetalheGov, esquemaOportunidade, MODALIDADES } from "@/integracoes/gov";
import { atrasoGov, chaveGov, proximoCursorGov, type CursorGov } from "@/dominio/gov-catalogo";
import { indexarGov } from "@/servicos/gov-ingestao";
import { alertarPrazosGov } from "@/servicos/gov-alertas";

const dia = (d: Date) => d.toISOString().slice(0, 10);
const adicionarDias = (d: string, n: number) => dia(new Date(new Date(`${d}T12:00:00Z`).getTime() + n * 86400000));
const MODALIDADES_PNCP = MODALIDADES.map(([id]) => Number(id));
let ligado = false;
function erroSeguro(e: unknown) {
  const mensagem = e instanceof Error ? e.message : "";
  return /^(Fonte oficial|A fonte oficial|PNCP:|Compras\.gov\.br:|Armazenamento|Coleta aguardando|Cursor|Reserva|Consulta de salvo|Registro não retornado)/.test(mensagem)
    ? mensagem.slice(0, 1000) : "Falha interna na atualização • dados anteriores e checkpoint preservados";
}

export async function prepararColetasGov() {
  const recente = adicionarDias(dia(new Date()), -7);
  const especificacoes = [
    ["pncp-abertas", "abertas", false, recente],
    ["compras-recentes", "compras", false, recente],
    ["pncp-alteracoes", "alteracoes", false, recente],
    ["pca-recentes", "planejamento", false, recente],
    ["compras-historico", "compras", true, "2021-01-01"],
    ["pncp-historico", "publicacoes", true, "2021-01-01"],
    ["pca-historico", "planejamento", true, "2021-04-01"],
    ["legado-historico", "pregoes", true, "2000-01-01"],
  ] as const;
  for (const [id, fonte, historica, inicio] of especificacoes) await prisma.govColeta.upsert({ where: { id }, update: {}, create: {
    id, fonte, historica, inicio: new Date(`${inicio}T00:00:00Z`), cursor: { dia: inicio, pagina: 1, modalidade: 1 },
  } });
}

export async function reservarColetaGov(token: string): Promise<GovColeta | null> {
  const linhas = await prisma.$queryRaw<GovColeta[]>(Prisma.sql`
    UPDATE gov_coletas SET "reservadoPor" = ${token}, "reservaAte" = now() + interval '5 minutes', "atualizadoEm" = now()
    WHERE id = (SELECT id FROM gov_coletas WHERE habilitada AND "proximaEm" <= now()
      AND ("reservaAte" IS NULL OR "reservaAte" < now())
      ORDER BY "proximaEm", historica, id FOR UPDATE SKIP LOCKED LIMIT 1) RETURNING *`);
  return linhas[0] ?? null;
}

export async function cicloColetaGov() {
  const token = randomUUID();
  const coleta = await reservarColetaGov(token);
  if (!coleta) return false;
  try {
    if (process.env.NODE_ENV === "production") {
      // Volume exclusivo do catálogo, montado somente para leitura de capacidade.
      const capacidade = await statfs("/app/gov-volume").catch(() => { throw new Error("Armazenamento da coleta indisponível; dados anteriores preservados"); });
      if (capacidade.bavail * capacidade.bsize < 2 * 1024 ** 3) throw new Error("Coleta aguardando espaço livre no armazenamento; checkpoint preservado");
      const local = await prisma.$queryRaw<{ local: string }[]>(Prisma.sql`SELECT COALESCE(pg_tablespace_location(reltablespace), '') AS local FROM pg_class WHERE oid = 'gov_registros'::regclass`);
      if (!local[0]?.local.endsWith("/engops-gov")) throw new Error("Armazenamento dedicado do catálogo ainda não foi aplicado");
    }
    const cursor = coleta.cursor as unknown as CursorGov;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(cursor.dia) || !Number.isInteger(cursor.pagina) || cursor.pagina < 1) throw new Error("Cursor de coleta inválido");
    const hoje = dia(new Date());
    const modalidades = ["publicacoes", "alteracoes"].includes(coleta.fonte) ? MODALIDADES_PNCP : [1];
    if (cursor.dia > hoje && coleta.fonte !== "abertas") {
      await prisma.govColeta.updateMany({ where: { id: coleta.id, reservadoPor: token }, data: { reservaAte: null, reservadoPor: null, proximaEm: new Date(Date.now() + 3600000) } });
      return true;
    }
    const fim = coleta.historica ? [adicionarDias(cursor.dia, 29), hoje].sort()[0] : cursor.dia;
    const fonte = coleta.fonte === "alteracoes" ? "publicacoes" : coleta.fonte;
    const resultado = await consultarGov({ fonte, pagina: cursor.pagina,
      ...(fonte === "abertas" ? { fim: "2099-12-31" } : { inicio: cursor.dia, fim }),
      ...(["publicacoes"].includes(fonte) ? { modalidade: cursor.modalidade } : {}),
    }, { tamanhoPagina: fonte === "planejamento" ? 5 : 500, atualizacoes: coleta.fonte === "alteracoes" });
    const terminouPagina = resultado.paginas === 0 || cursor.pagina >= resultado.paginas;
    let seguinte = proximoCursorGov(cursor, resultado.paginas, modalidades);
    const terminouPeriodo = terminouPagina && (seguinte.dia !== cursor.dia);
    if (terminouPeriodo) seguinte = { ...seguinte, dia: adicionarDias(fim, 1) };
    const cicloCompleto = fonte === "abertas" ? terminouPagina : seguinte.dia > hoje;
    const cursorFinal = cicloCompleto && !coleta.historica ? { dia: adicionarDias(hoje, -7), pagina: 1, modalidade: modalidades[0] } : seguinte;
    await prisma.$transaction(async tx => {
      const atual = await tx.govColeta.findFirst({ where: { id: coleta.id, reservadoPor: token, reservaAte: { gt: new Date() } } });
      if (!atual) throw new Error("Reserva da coleta venceu; página será repetida");
      const unicos = [...new Map(resultado.itens.map(i => [chaveGov(i), i])).values()].sort((a, b) => chaveGov(a).localeCompare(chaveGov(b)));
      for (const item of unicos) await indexarGov(tx, item);
      const gravou = await tx.govColeta.updateMany({ where: { id: coleta.id, reservadoPor: token }, data: {
        cursor: cursorFinal, reservaAte: null, reservadoPor: null, falhas: 0, ultimoErro: null,
        ultimoSucessoEm: new Date(), paginas: { increment: 1 }, registros: { increment: resultado.itens.length },
        ...(terminouPeriodo || (fonte === "abertas" && terminouPagina) ? { cobertoAte: new Date(`${fonte === "abertas" ? hoje : fim}T23:59:59Z`) } : {}),
        ...(cicloCompleto ? { ciclos: { increment: 1 } } : {}),
        proximaEm: new Date(Date.now() + (cicloCompleto ? coleta.historica ? 3600000 : 30 * 60000 : 5000)),
      } });
      if (!gravou.count) throw new Error("Reserva perdida; transação desfeita");
    }, { timeout: 120000 });
    return true;
  } catch (e) {
    await prisma.govColeta.updateMany({ where: { id: coleta.id, reservadoPor: token }, data: {
      reservaAte: null, reservadoPor: null, falhas: { increment: 1 }, ultimoErro: erroSeguro(e), proximaEm: new Date(Date.now() + atrasoGov(coleta.falhas + 1)),
    } });
    return true;
  }
}

export async function conferirSalvoGov() {
  const salva = await prisma.oportunidadeGovSalva.findFirst({ where: { proximaConferenciaEm: { lte: new Date() } }, orderBy: { proximaConferenciaEm: "asc" } });
  if (!salva) return;
  const reservado = await prisma.oportunidadeGovSalva.updateMany({ where: { id: salva.id, proximaConferenciaEm: { lte: new Date() } }, data: { proximaConferenciaEm: new Date(Date.now() + 5 * 60000) } });
  if (!reservado.count) return;
  try {
    const item = await consultarDetalheGov(esquemaOportunidade.parse(salva.dados));
    if (!item) throw new Error("Registro não retornado pela fonte; retrato anterior preservado");
    await prisma.$transaction(tx => indexarGov(tx, item), { timeout: 60000 });
  } catch (e) {
    await prisma.oportunidadeGovSalva.update({ where: { id: salva.id }, data: { erroConferencia: erroSeguro(e), proximaConferenciaEm: new Date(Date.now() + 15 * 60000) } });
  }
}

export function iniciarColetaGov() {
  if (ligado) return;
  ligado = true;
  let preparadas = false;
  const laco = async () => {
    try { if (!preparadas) { await prepararColetasGov(); preparadas = true; } await cicloColetaGov(); }
    catch (e) { console.error("[engops] catálogo GOV", e instanceof Error ? e.message : "falha"); }
    finally { setTimeout(laco, 5000); }
  };
  const salvos = async () => {
    try { await conferirSalvoGov(); await alertarPrazosGov(); }
    catch (e) { console.error("[engops] alertas GOV", e instanceof Error ? e.message : "falha"); }
    finally { setTimeout(salvos, 60000); }
  };
  // Duas reservas independentes: uma fonte lenta não bloqueia todas as outras.
  setTimeout(laco, 10000); setTimeout(laco, 12000); setTimeout(salvos, 30000);
}
