import type { Prioridade, StatusDemanda, TipoServico } from "@prisma/client";

/**
 * Regras da demanda que não dependem de banco nem de tela: nomes, ordem da
 * jornada, transições permitidas. Testável sem Postgres.
 */

export const STATUS: ReadonlyArray<readonly [StatusDemanda, string]> = [
  ["NOVA", "Nova"],
  ["EM_PREPARACAO", "Em preparação"],
  ["AGUARDANDO_DOCUMENTOS", "Aguardando documentos"],
  ["PRONTA_PARA_PROCESSAMENTO", "Pronta para processamento"],
  ["EM_PROCESSAMENTO", "Em processamento"],
  ["SIMIL_PENDENTE", "SIMIL pendente"],
  ["SIMIL_CONCLUIDO", "SIMIL concluído"],
  ["RAE_PENDENTE", "RAE pendente"],
  ["RAE_CONCLUIDO", "RAE concluído"],
  ["SIOPI_PENDENTE", "SIOPI pendente"],
  ["EM_CONFERENCIA", "Em conferência"],
  ["COM_DIVERGENCIA", "Com divergência"],
  ["PRONTA_PARA_ENTREGA", "Pronta para entrega"],
  ["ENTREGUE", "Entregue"],
  ["ARQUIVADA", "Arquivada"],
  ["ERRO", "Erro"],
];

export function nomeDoStatus(s: StatusDemanda): string {
  return STATUS.find(([k]) => k === s)?.[1] ?? s;
}

/** Colunas do Kanban: agrupa os 16 estados em 6 colunas que cabem na tela. */
export const COLUNAS_KANBAN: ReadonlyArray<{ chave: string; rotulo: string; status: StatusDemanda[] }> = [
  { chave: "entrada", rotulo: "Entrada", status: ["NOVA", "EM_PREPARACAO", "AGUARDANDO_DOCUMENTOS"] },
  { chave: "pronta", rotulo: "Pronta", status: ["PRONTA_PARA_PROCESSAMENTO"] },
  { chave: "simil", rotulo: "SIMIL", status: ["EM_PROCESSAMENTO", "SIMIL_PENDENTE", "SIMIL_CONCLUIDO"] },
  { chave: "rae-siopi", rotulo: "RAE / SIOPI", status: ["RAE_PENDENTE", "RAE_CONCLUIDO", "SIOPI_PENDENTE"] },
  { chave: "conferencia", rotulo: "Conferência", status: ["EM_CONFERENCIA", "COM_DIVERGENCIA", "ERRO"] },
  { chave: "entrega", rotulo: "Entrega", status: ["PRONTA_PARA_ENTREGA", "ENTREGUE", "ARQUIVADA"] },
];

/** Estados em que a demanda ainda está viva na operação. */
export const STATUS_ABERTOS: StatusDemanda[] = STATUS.map(([k]) => k).filter(
  (s) => s !== "ENTREGUE" && s !== "ARQUIVADA",
);

/**
 * Para onde cada estado pode ir por ação HUMANA. As transições da automação
 * (SIMIL_PENDENTE → SIMIL_CONCLUIDO etc.) passam por `avancar()` no motor,
 * que também consulta esta tabela.
 */
const TRANSICOES: Record<StatusDemanda, StatusDemanda[]> = {
  NOVA: ["EM_PREPARACAO", "AGUARDANDO_DOCUMENTOS", "ARQUIVADA"],
  EM_PREPARACAO: ["AGUARDANDO_DOCUMENTOS", "PRONTA_PARA_PROCESSAMENTO", "ARQUIVADA"],
  AGUARDANDO_DOCUMENTOS: ["EM_PREPARACAO", "PRONTA_PARA_PROCESSAMENTO", "ARQUIVADA"],
  PRONTA_PARA_PROCESSAMENTO: ["EM_PROCESSAMENTO", "SIMIL_PENDENTE", "EM_PREPARACAO", "ARQUIVADA"],
  EM_PROCESSAMENTO: ["SIMIL_PENDENTE", "ERRO", "EM_PREPARACAO"],
  SIMIL_PENDENTE: ["SIMIL_CONCLUIDO", "ERRO", "EM_PREPARACAO", "COM_DIVERGENCIA"],
  SIMIL_CONCLUIDO: ["RAE_PENDENTE", "EM_CONFERENCIA"],
  RAE_PENDENTE: ["RAE_CONCLUIDO", "ERRO", "COM_DIVERGENCIA"],
  RAE_CONCLUIDO: ["SIOPI_PENDENTE", "EM_CONFERENCIA"],
  SIOPI_PENDENTE: ["EM_CONFERENCIA", "ERRO", "COM_DIVERGENCIA"],
  EM_CONFERENCIA: ["PRONTA_PARA_ENTREGA", "COM_DIVERGENCIA", "EM_PREPARACAO"],
  COM_DIVERGENCIA: ["EM_PREPARACAO", "EM_CONFERENCIA", "PRONTA_PARA_PROCESSAMENTO"],
  PRONTA_PARA_ENTREGA: ["ENTREGUE", "EM_CONFERENCIA"],
  ENTREGUE: ["ARQUIVADA", "EM_CONFERENCIA"],
  ARQUIVADA: ["NOVA"],
  ERRO: ["EM_PREPARACAO", "PRONTA_PARA_PROCESSAMENTO", "ARQUIVADA"],
};

export function podeTransitar(de: StatusDemanda, para: StatusDemanda): boolean {
  return de === para || (TRANSICOES[de] ?? []).includes(para);
}

export function transicoesDe(de: StatusDemanda): StatusDemanda[] {
  return TRANSICOES[de] ?? [];
}

export const TIPOS_SERVICO: ReadonlyArray<readonly [TipoServico, string]> = [
  ["AVALIACAO_IMOVEL", "Avaliação de imóvel"],
  ["ACOMPANHAMENTO_OBRA", "Acompanhamento de obra"],
  ["VISTORIA", "Vistoria"],
  ["LAUDO_TECNICO", "Laudo técnico"],
  ["OUTRO", "Outro"],
];

export function nomeDoTipo(t: TipoServico): string {
  return TIPOS_SERVICO.find(([k]) => k === t)?.[1] ?? t;
}

export const PRIORIDADES: ReadonlyArray<readonly [Prioridade, string]> = [
  ["BAIXA", "Baixa"],
  ["NORMAL", "Normal"],
  ["ALTA", "Alta"],
  ["URGENTE", "Urgente"],
];

export const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI",
  "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
] as const;

/** ENG-0001. O prefixo é fixo; o número é sequencial por empresa. */
export function formatarCodigo(n: number): string {
  return `ENG-${String(n).padStart(4, "0")}`;
}

/** Progresso (0 a 100) pela posição na jornada. É indicação, não medida. */
export function progressoDoStatus(s: StatusDemanda): number {
  const ordem: StatusDemanda[] = [
    "NOVA", "EM_PREPARACAO", "AGUARDANDO_DOCUMENTOS", "PRONTA_PARA_PROCESSAMENTO", "EM_PROCESSAMENTO",
    "SIMIL_PENDENTE", "SIMIL_CONCLUIDO", "RAE_PENDENTE", "RAE_CONCLUIDO", "SIOPI_PENDENTE",
    "EM_CONFERENCIA", "PRONTA_PARA_ENTREGA", "ENTREGUE",
  ];
  if (s === "ARQUIVADA") return 100;
  if (s === "COM_DIVERGENCIA" || s === "ERRO") return 50;
  const i = ordem.indexOf(s);
  return i < 0 ? 0 : Math.round((i / (ordem.length - 1)) * 100);
}
