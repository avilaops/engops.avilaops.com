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
    prisma.$queryRaw<TotalGov[]>(Prisma.sql`SELECT tipo, count(*) AS quantidade, count(valor) AS "comValor", sum(valor) AS valor FROM gov_registros ${where} GROUP BY tipo ORDER BY tipo`),
  ]);
  const total = totais.reduce((n, r) => n + Number(r.quantidade), 0);
  return { itens, totais, total, pagina: filtros.pagina, paginas: Math.ceil(total / 30), filtros };
}

export async function analisarGlobalGov(entrada: unknown) {
  const filtros = esquemaBuscaGlobal.parse(entrada);
  const where = whereGov(filtros);
  const grupos = { orgaos: [], regioes: [], categorias: [], modalidades: [], periodos: [] } as Record<"orgaos" | "regioes" | "categorias" | "modalidades" | "periodos", GrupoGov[]>;
  const totais: TotalGov[] = [];
  type Linha = GrupoGov & { dimensao: keyof typeof grupos | "totais"; comValor: bigint };
  // Uma leitura da base filtrada para totais e dimensões no mesmo retrato.
  // Normalizar os rótulos
  // antes de agrupar mantém nulos e rótulos equivalentes no mesmo grupo.
  const linhas = await prisma.$transaction(async tx => {
    // A configuração vale somente nesta transação; não altera o pool nem o banco.
    // Evita ordenar milhões de linhas em disco para poucos milhares de grupos.
    await tx.$executeRaw(Prisma.sql`SET LOCAL work_mem = '16MB'`);
    return tx.$queryRaw<Linha[]>(Prisma.sql`
      WITH grupos AS (
        SELECT
          CASE WHEN GROUPING(tipo)=0 THEN 'totais' WHEN GROUPING(orgao)=0 THEN 'orgaos' WHEN GROUPING(regiao)=0 THEN 'regioes'
            WHEN GROUPING(categoria)=0 THEN 'categorias' WHEN GROUPING(modalidade)=0 THEN 'modalidades' ELSE 'periodos' END AS dimensao,
          CASE WHEN GROUPING(tipo)=0 THEN tipo WHEN GROUPING(orgao)=0 THEN orgao WHEN GROUPING(regiao)=0 THEN regiao
            WHEN GROUPING(categoria)=0 THEN categoria WHEN GROUPING(modalidade)=0 THEN modalidade ELSE periodo END AS grupo,
          count(*) AS quantidade, count(valor) AS "comValor",
          CASE WHEN GROUPING(tipo)=0 THEN sum(valor) ELSE sum(valor) FILTER (WHERE tipo='CONTRATACAO') END AS valor
        FROM (
          SELECT orgao, COALESCE(regiao,'Não informada') AS regiao,
            COALESCE(categoria,'Não informada pela fonte') AS categoria,
            COALESCE(modalidade,'Não informada') AS modalidade,
            COALESCE(to_char(publicado,'YYYY-MM'),'Sem data') AS periodo, tipo, valor
          FROM gov_registros ${where}
        ) AS filtrados
        GROUP BY GROUPING SETS ((tipo),(orgao),(regiao),(categoria),(modalidade),(periodo))
      ), ordenados AS (
        SELECT *, row_number() OVER (PARTITION BY dimensao ORDER BY quantidade DESC,grupo) AS posicao FROM grupos
      )
      SELECT dimensao,grupo,quantidade,"comValor",valor FROM ordenados WHERE posicao<=20 ORDER BY dimensao,posicao`);
  }, { timeout: 60000 });
  for (const { dimensao, comValor, ...grupo } of linhas) {
    if (dimensao === "totais") totais.push({ tipo: grupo.grupo, quantidade: grupo.quantidade, comValor, valor: grupo.valor });
    else grupos[dimensao].push(grupo);
  }
  totais.sort((a, b) => a.tipo.localeCompare(b.tipo));
  return { grupos, totais, total: totais.reduce((n, r) => n + Number(r.quantidade), 0) };
}

export function coberturaGov() {
  return prisma.govColeta.findMany({ orderBy: [{ historica: "asc" }, { id: "asc" }], select: {
    id: true, fonte: true, historica: true, habilitada: true, inicio: true, cobertoAte: true,
    ultimoSucessoEm: true, ultimoErro: true, paginas: true, registros: true, ciclos: true, falhas: true, proximaEm: true, reservaAte: true,
  } });
}
