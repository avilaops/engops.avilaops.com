import type { PapelMembro } from "@prisma/client";

/**
 * O que cada papel pode fazer. Permissão é por AÇÃO, não por tela: a tela
 * esconde o que o papel não alcança (não oferecer porta fechada), e a rota
 * confere de novo com a mesma função.
 */
export type Acao =
  | "demanda.ver"
  | "demanda.criar"
  | "demanda.editar"
  | "demanda.arquivar"
  | "documento.enviar"
  | "documento.remover"
  | "pendencia.resolver"
  | "automacao.preparar"
  | "automacao.executar"
  | "automacao.aprovar"
  | "empresa.administrar"
  | "relatorio.ver";

const MATRIZ: Record<PapelMembro, ReadonlySet<Acao>> = {
  ADMIN: new Set<Acao>([
    "demanda.ver", "demanda.criar", "demanda.editar", "demanda.arquivar",
    "documento.enviar", "documento.remover", "pendencia.resolver",
    "automacao.preparar", "automacao.executar", "automacao.aprovar",
    "empresa.administrar", "relatorio.ver",
  ]),
  GESTOR: new Set<Acao>([
    "demanda.ver", "demanda.criar", "demanda.editar", "demanda.arquivar",
    "documento.enviar", "documento.remover", "pendencia.resolver",
    "automacao.preparar", "automacao.executar", "automacao.aprovar",
    "relatorio.ver",
  ]),
  OPERADOR: new Set<Acao>([
    "demanda.ver", "demanda.criar", "demanda.editar",
    "documento.enviar", "pendencia.resolver",
    "automacao.preparar", "automacao.executar",
  ]),
  REVISOR: new Set<Acao>([
    "demanda.ver", "pendencia.resolver", "automacao.aprovar", "relatorio.ver",
  ]),
  CONSULTA: new Set<Acao>(["demanda.ver", "relatorio.ver"]),
};

export function pode(papel: PapelMembro, acao: Acao): boolean {
  return MATRIZ[papel]?.has(acao) ?? false;
}

export const PAPEIS: ReadonlyArray<readonly [PapelMembro, string]> = [
  ["ADMIN", "Administrador"],
  ["GESTOR", "Gestor"],
  ["OPERADOR", "Operador"],
  ["REVISOR", "Revisor"],
  ["CONSULTA", "Consulta"],
];

export function nomeDoPapel(papel: PapelMembro): string {
  return PAPEIS.find(([p]) => p === papel)?.[1] ?? papel;
}
