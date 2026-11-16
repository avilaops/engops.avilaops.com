import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { esquemaBuscaGlobal, normalizarBuscaGov, type BuscaGlobalGov } from "@/dominio/gov-catalogo";
import type { OportunidadeGov } from "@/integracoes/gov";

export function whereGov(f: BuscaGlobalGov): Prisma.Sql {
  const condicoes: Prisma.Sql[] = [Prisma.sql`true`];
  const contem = (v: string) => `%${normalizarBuscaGov(v).replace(/[\\%_]/g, "\\$&")}%`;
  if (f.busca) condicoes.push(Prisma.sql`to_tsvector('portuguese', busca) @@ plainto_tsquery('portuguese', ${normalizarBuscaGov(f.busca)})`);
  if (f.orgao) condicoes.push(Prisma.sql`lower(translate(orgao, 'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ', 'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC')) LIKE ${contem(f.orgao)}`);
  if (f.cnpj) condicoes.push(Prisma.sql`cnpj = ${f.cnpj}`);
  if (f.uf) condicoes.push(Prisma.sql`uf = ${f.uf}`);
  if (f.regiao) condicoes.push(Prisma.sql`regiao = ${f.regiao}`);
  if (f.categoria) condicoes.push(Prisma.sql`categoria = ${f.categoria}`);
  if (f.modalidade) condicoes.push(Prisma.sql`modalidade = ${f.modalidade}`);
  if (f.tipo) condicoes.push(Prisma.sql`tipo = ${f.tipo}`);
  if (f.fonte) condicoes.push(Prisma.sql`${f.fonte} = ANY(fontes)`);
  if (f.inicio) condicoes.push(Prisma.sql`publicado >= ${new Date(`${f.inicio}T00:00:00Z`)}`);
  if (f.fim) condicoes.push(Prisma.sql`publicado < ${new Date(new Date(`${f.fim}T00:00:00Z`).getTime() + 86400000)}`);
  if (f.minimo !== undefined) condicoes.push(Prisma.sql`valor >= ${new Prisma.Decimal(String(f.minimo))}`);
  if (f.maximo !== undefined) condicoes.push(Prisma.sql`valor <= ${new Prisma.Decimal(String(f.maximo))}`);
  if (f.abertas === "sim") condicoes.push(Prisma.sql`tipo <> 'PLANEJAMENTO' AND prazo > CURRENT_TIMESTAMP AND NOT (lower(COALESCE(dados->>'situacao','')) ~ '(revogad|anulad|cancelad|suspens)')`);
  return Prisma.sql`WHERE ${Prisma.join(condicoes, " AND ")}`;
}

export type LinhaGov = { id: string; dados: OportunidadeGov; fontes: string[]; revisao: number; conferidoEm: Date };
export type TotalGov = { tipo: string; quantidade: bigint; comValor: bigint; valor: Prisma.Decimal | null };
export type GrupoGov = { grupo: string; quantidade: bigint; valor: Prisma.Decimal | null };

export async function buscarGlobalGov(entrada: unknown) {
  const filtros = esquemaBuscaGlobal.parse(entrada);
  const where = whereGov(filtros);
  const [itens, totais] = await Promise.all([
    prisma.$queryRaw<LinhaGov[]>(Prisma.sql`SELECT id, dados, fontes, revisao, "conferidoEm" FROM gov_registros ${where} ORDER BY publicado DESC NULLS LAST, id DESC LIMIT 30 OFFSET ${(filtros.pagina - 1) * 30}`),
    prisma.$queryRaw<TotalGov[]>(Prisma.sql`SELECT tipo, count(*) AS quantidade, count(valor) AS "comValor", sum(valor) AS valor FROM gov_registros ${where} GROUP BY tipo`),
  ]);
  const total = totais.reduce((n, r) => n + Number(r.quantidade), 0);
  return { itens, totais, total, pagina: filtros.pagina, paginas: Math.ceil(total / 30), filtros };
}

export async function analisarGlobalGov(entrada: unknown) {
  const filtros = esquemaBuscaGlobal.parse(entrada);
  const where = whereGov(filtros);
  // Identificadores fixos; nenhum nome de coluna vem do navegador.
  const agrupamentos = {
    orgaos: Prisma.sql`orgao`, regioes: Prisma.sql`COALESCE(regiao, 'Não informada')`,
    categorias: Prisma.sql`COALESCE(categoria, 'Não informada pela fonte')`,
    modalidades: Prisma.sql`COALESCE(modalidade, 'Não informada')`,
    periodos: Prisma.sql`COALESCE(to_char(publicado, 'YYYY-MM'), 'Sem data')`,
  };
  const resultados = await Promise.all(Object.entries(agrupamentos).map(async ([nome, coluna]) => {
    const grupos = await prisma.$queryRaw<GrupoGov[]>(Prisma.sql`SELECT ${coluna} AS grupo, count(*) AS quantidade, sum(valor) FILTER (WHERE tipo = 'CONTRATACAO') AS valor FROM gov_registros ${where} GROUP BY ${coluna} ORDER BY quantidade DESC, grupo LIMIT 20`);
    return [nome, grupos] as const;
  }));
  return Object.fromEntries(resultados) as Record<keyof typeof agrupamentos, GrupoGov[]>;
}

export function coberturaGov() {
  return prisma.govColeta.findMany({ orderBy: [{ historica: "asc" }, { id: "asc" }], select: {
    id: true, fonte: true, historica: true, habilitada: true, inicio: true, cobertoAte: true,
    ultimoSucessoEm: true, ultimoErro: true, paginas: true, registros: true, ciclos: true, falhas: true, proximaEm: true, reservaAte: true,
  } });
}
