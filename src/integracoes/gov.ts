import { z } from "zod";

export const UFS = "AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO".split(" ");
export const MODALIDADES = [[1, "Leilão eletrônico"], [2, "Diálogo competitivo"], [3, "Concurso"], [4, "Concorrência eletrônica"], [5, "Concorrência presencial"], [6, "Pregão eletrônico"], [7, "Pregão presencial"], [8, "Dispensa"], [9, "Inexigibilidade"], [10, "Manifestação de interesse"], [11, "Pré-qualificação"], [12, "Credenciamento"], [13, "Leilão presencial"]] as const;
const data = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => {
  const d = new Date(`${v}T12:00:00Z`);
  return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === v;
}, "Data inválida");
export const esquemaFiltrosGov = z.object({
  fonte: z.enum(["abertas", "publicacoes", "planejamento", "pregoes", "compras"]).default("abertas"),
  inicio: data.optional(), fim: data.optional(),
  pagina: z.coerce.number().int().min(1).max(100000).default(1),
  uf: z.string().refine(v => UFS.includes(v), "UF inválida").optional(),
  cnpj: z.string().regex(/^\d{14}$/, "CNPJ do órgão deve ter 14 dígitos").optional(),
  modalidade: z.coerce.number().int().min(1).max(13).optional(),
  busca: z.string().trim().max(200).optional(),
  orgao: z.string().trim().max(200).optional(),
  minimo: z.coerce.number().finite().nonnegative().optional(),
  maximo: z.coerce.number().finite().nonnegative().optional(),
}).superRefine((v, ctx) => {
  if (v.inicio && v.fim && v.inicio > v.fim) ctx.addIssue({ code: "custom", message: "Data inicial deve anteceder a final" });
  if (v.minimo !== undefined && v.maximo !== undefined && v.minimo > v.maximo) ctx.addIssue({ code: "custom", message: "Valor mínimo deve ser menor que o máximo" });
  if (v.fonte === "compras" && v.modalidade !== undefined && v.modalidade !== 6) ctx.addIssue({ code: "custom", message: "A consulta Compras.gov.br desta aba é de pregões" });
  if (v.fonte !== "abertas" && v.inicio && v.fim && (new Date(v.fim).getTime() - new Date(v.inicio).getTime()) / 86400000 > 365) ctx.addIssue({ code: "custom", message: "Consulte intervalos de até 365 dias" });
});
export type FiltrosGov = z.infer<typeof esquemaFiltrosGov>;
export const esquemaOportunidade = z.object({
  id: z.string().min(1).max(300), fonte: z.enum(["PNCP", "COMPRAS"]),
  tipo: z.enum(["CONTRATACAO", "PLANEJAMENTO", "PREGAO"]),
  objeto: z.string().max(50000), orgao: z.string().max(1000),
  cnpj: z.string().nullable(), uf: z.string().nullable(), municipio: z.string().nullable(),
  modalidade: z.string().nullable(), situacao: z.string().nullable(),
  valor: z.number().finite().nullable(), publicado: z.string().nullable(),
  prazo: z.string().nullable(), atualizado: z.string().nullable(), ano: z.number().nullable(),
  url: z.string().url().refine(v => {
    const u = new URL(v);
    return u.protocol === "https:" && !u.username && !u.password && ["pncp.gov.br", "comprasnet.gov.br", "dadosabertos.compras.gov.br"].includes(u.hostname) && (!u.port || u.port === "443");
  }, "Link oficial inválido"),
});
export type OportunidadeGov = z.infer<typeof esquemaOportunidade>;
export type ResultadoGov = { itens: OportunidadeGov[]; total: number; paginas: number; pagina: number; consultadoEm: string; unidadePaginacao: "registros" | "planos"; endpoint: string };
type Registro = Record<string, unknown>;
const objeto = (v: unknown): Registro => v && typeof v === "object" && !Array.isArray(v) ? v as Registro : {};
const texto = (v: unknown): string | null => typeof v === "string" && v.trim() ? v : null;
const numero = (v: unknown): number | null => v !== null && v !== undefined && v !== "" && Number.isFinite(Number(v)) ? Number(v) : null;
const compacto = (v: string) => v.replaceAll("-", "");
const isoDia = (d: Date) => d.toISOString().slice(0, 10);

function normalizarPncp(r: Registro): OportunidadeGov {
  const orgao = objeto(r.orgaoEntidade), unidade = objeto(r.unidadeOrgao);
  const cnpj = texto(orgao.cnpj), ano = numero(r.anoCompra), sequencial = numero(r.sequencialCompra);
  if (!cnpj || !/^\d{14}$/.test(cnpj) || !ano || !sequencial || !texto(r.numeroControlePNCP)) throw new Error("PNCP: formato de identificação inválido");
  return esquemaOportunidade.parse({
    id: String(r.numeroControlePNCP), fonte: "PNCP", tipo: "CONTRATACAO",
    objeto: texto(r.objetoCompra) ?? "Objeto não informado", orgao: texto(orgao.razaoSocial) ?? "Órgão não informado",
    cnpj, uf: texto(unidade.ufSigla), municipio: texto(unidade.municipioNome), modalidade: texto(r.modalidadeNome), situacao: texto(r.situacaoCompraNome),
    valor: numero(r.valorTotalEstimado), publicado: texto(r.dataPublicacaoPncp), prazo: texto(r.dataEncerramentoProposta), atualizado: texto(r.dataAtualizacaoGlobal) ?? texto(r.dataAtualizacao), ano,
    url: `https://pncp.gov.br/app/editais/${cnpj}/${ano}/${sequencial}`,
  });
}

function normalizarPlano(r: Registro): OportunidadeGov[] {
  const cnpj = texto(r.orgaoEntidadeCnpj), ano = numero(r.anoPca), id = texto(r.idPcaPncp);
  if (!id || !cnpj || !/^\d{14}$/.test(cnpj) || !ano || !Array.isArray(r.itens)) throw new Error("PNCP: formato de plano inválido");
  const sequencial = id.match(/-0-(\d+)\//)?.[1];
  if (!sequencial) throw new Error("PNCP: formato de identificador do plano inválido");
  return r.itens.map(v => {
    const item = objeto(v);
    if (item.numeroItem === null || item.numeroItem === undefined) throw new Error("PNCP: item de plano sem identificação");
    return esquemaOportunidade.parse({
      id: `${id}#${item.numeroItem}`, fonte: "PNCP", tipo: "PLANEJAMENTO", objeto: texto(item.descricaoItem) ?? "Item não informado",
      orgao: texto(r.orgaoEntidadeRazaoSocial) ?? "Órgão não informado", cnpj, uf: null, municipio: null, modalidade: texto(item.categoriaItemPcaNome), situacao: "Planejado • não é edital aberto",
      valor: numero(item.valorTotal), publicado: texto(r.dataPublicacaoPNCP), prazo: texto(item.dataDesejada), atualizado: texto(r.dataAtualizacaoGlobalPCA), ano,
      url: `https://pncp.gov.br/app/pca/${cnpj}/${ano}/${Number(sequencial)}`,
    });
  });
}

function normalizarPregao(r: Registro): OportunidadeGov {
  const id = texto(r.id_compra);
  if (!id) throw new Error("Compras.gov.br: formato de pregão sem identificação");
  return esquemaOportunidade.parse({
    id, fonte: "COMPRAS", tipo: "PREGAO", objeto: texto(r.tx_objeto) ?? "Objeto não informado",
    orgao: texto(r.no_orgao) ?? texto(r.no_ausg) ?? `UASG ${r.co_uasg ?? "não informada"}`,
    cnpj: null, uf: texto(r.sg_uf), municipio: texto(r.no_municipio), modalidade: texto(r.ds_tipo_pregao_compra) ?? "Pregão • módulo legado",
    situacao: texto(r.ds_situacao_pregao) ?? "Histórico • conferir situação oficial", valor: numero(r.valor_estimado_total), publicado: texto(r.dt_data_edital), prazo: texto(r.dt_fim_proposta), atualizado: texto(r.dt_alteracao), ano: null,
    url: `https://dadosabertos.compras.gov.br/modulo-legado/3.1_consultarPregoes_Id?id_compra=${encodeURIComponent(id)}`,
  });
}

function normalizarCompras(r: Registro): OportunidadeGov {
  return { ...normalizarPncp({
    ...r, orgaoEntidade: { cnpj: r.orgaoEntidadeCnpj, razaoSocial: r.orgaoEntidadeRazaoSocial },
    unidadeOrgao: { ufSigla: r.unidadeOrgaoUfSigla, municipioNome: r.unidadeOrgaoMunicipioNome },
    anoCompra: r.anoCompraPncp, sequencialCompra: r.sequencialCompraPncp,
    dataEncerramentoProposta: r.dataEncerramentoPropostaPncp,
    dataAtualizacao: r.dataAtualizacaoPncp, situacaoCompraNome: r.situacaoCompraNomePncp,
  }), fonte: "COMPRAS" };
}

export async function consultarGov(entrada: unknown): Promise<ResultadoGov> {
  const f = esquemaFiltrosGov.parse(entrada);
  const hoje = new Date();
  const inicio = f.inicio ?? isoDia(new Date(hoje.getTime() - 7 * 86400000));
  const fim = f.fim ?? isoDia(f.fonte === "abertas" ? new Date(hoje.getFullYear() + 1, 11, 31, 12) : hoje);
  if (inicio > fim) throw new Error("Data inicial deve anteceder a final");
  const params = new URLSearchParams({ pagina: String(f.pagina), tamanhoPagina: f.fonte === "planejamento" ? "1" : "10" });
  let endpoint: string;
  if (f.fonte === "compras") {
    endpoint = "https://dadosabertos.compras.gov.br/modulo-contratacoes/1_consultarContratacoes_PNCP_14133";
    params.set("dataPublicacaoPncpInicial", inicio); params.set("dataPublicacaoPncpFinal", fim);
    // SIASG usa 5 para pregão; PNCP usa 6 para pregão eletrônico.
    params.set("codigoModalidade", "5");
    if (f.uf) params.set("unidadeOrgaoUfSigla", f.uf);
    if (f.cnpj) params.set("orgaoEntidadeCnpj", f.cnpj);
    if (f.busca) params.set("objetoCompra", f.busca);
  } else if (f.fonte === "pregoes") {
    endpoint = "https://dadosabertos.compras.gov.br/modulo-legado/3_consultarPregoes";
    params.set("dt_data_edital_inicial", inicio); params.set("dt_data_edital_final", fim);
  } else {
    const caminho = f.fonte === "planejamento" ? "pca/atualizacao" : `contratacoes/${f.fonte === "publicacoes" ? "publicacao" : "proposta"}`;
    endpoint = `https://pncp.gov.br/api/consulta/v1/${caminho}`;
    if (f.fonte === "planejamento") { params.set("dataInicio", compacto(inicio)); params.set("dataFim", compacto(fim)); }
    else { params.set("dataFinal", compacto(fim)); if (f.fonte === "publicacoes") params.set("dataInicial", compacto(inicio)); }
    if (f.cnpj) params.set("cnpj", f.cnpj);
    if (f.fonte !== "planejamento") {
      if (f.uf) params.set("uf", f.uf);
      if (f.modalidade || f.fonte === "publicacoes") params.set("codigoModalidadeContratacao", String(f.modalidade ?? 6));
    }
  }
  const url = `${endpoint}?${params}`;
  let r: Response;
  try { r = await fetch(url, { signal: AbortSignal.timeout(30000), cache: "no-store", headers: { Accept: "application/json" } }); }
  catch { throw new Error("A fonte oficial não respondeu em tempo. Tente novamente; isso não indica ausência de oportunidades."); }
  const base = { pagina: f.pagina, consultadoEm: new Date().toISOString(), unidadePaginacao: f.fonte === "planejamento" ? "planos" as const : "registros" as const, endpoint: url };
  if (r.status === 204) return { ...base, itens: [], total: 0, paginas: 0 };
  if (!r.ok) throw new Error(`Fonte oficial indisponível • HTTP ${r.status}. Tente novamente.`);
  const body = objeto(await r.json().catch(() => { throw new Error("Fonte oficial retornou formato inválido"); }));
  const registros = ["pregoes", "compras"].includes(f.fonte) ? body.resultado : body.data;
  if (!Array.isArray(registros) || numero(body.totalRegistros) === null || numero(body.totalPaginas) === null) throw new Error("Fonte oficial retornou formato desconhecido");
  const itens = f.fonte === "planejamento" ? registros.flatMap(v => normalizarPlano(objeto(v))) : registros.map(v => f.fonte === "pregoes" ? normalizarPregao(objeto(v)) : f.fonte === "compras" ? normalizarCompras(objeto(v)) : normalizarPncp(objeto(v)));
  return { ...base, itens, total: Number(body.totalRegistros), paginas: Number(body.totalPaginas) };
}

const semAcento = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
export function filtrarPaginaGov(itens: OportunidadeGov[], filtros: { busca?: string; orgao?: string; minimo?: number; maximo?: number }) {
  return itens.filter(i => (!filtros.busca || semAcento(i.objeto).includes(semAcento(filtros.busca))) &&
    (!filtros.orgao || semAcento(i.orgao).includes(semAcento(filtros.orgao))) &&
    (filtros.minimo === undefined || (i.valor !== null && i.valor >= filtros.minimo)) &&
    (filtros.maximo === undefined || (i.valor !== null && i.valor <= filtros.maximo)));
}
