import { normalizarDecimal, execucaoOrcamentariaPacDTOSchema } from "@/dominio/siop";

/** Mantém os centavos do numeric(16,2), inclusive acima do limite seguro de Number. */
export function formatarValorSiop(valor: unknown): string {
  if (valor === undefined || valor === null) return "Não informado";
  const normalizado = normalizarDecimal(String(valor));
  const [inteiro, centavos] = normalizado.replace(/^-/, "").split(".");
  return `${normalizado.startsWith("-") ? "-" : ""}R$ ${BigInt(inteiro).toLocaleString("pt-BR")},${centavos}`;
}

export function paginaIntegracao(valor: string | string[] | undefined): number {
  return typeof valor === "string" && /^[1-9]\d{0,5}$/.test(valor) ? Number(valor) : 1;
}

// A lista deriva do contrato completo. Nenhum campo opcional desaparece da tela.
export const CAMPOS_SIOP_TELA = Object.keys(execucaoOrcamentariaPacDTOSchema.shape);
export const ROTULOS_SIOP: Record<keyof typeof execucaoOrcamentariaPacDTOSchema.shape, string> = {
  acao: "Ação", anoexercicio: "Exercício", antecipado: "Antecipado", autorizado: "Autorizado",
  bloqueado_remanejamento_de_credito: "Bloqueio para remanejamento de crédito", bloqueado_rp2: "Bloqueado • RP 2", bloqueado_rp3: "Bloqueado • RP 3",
  descricaoesfera: "Descrição da esfera", descricaofuncao: "Descrição da função", descricaolocalizador: "Descrição do localizador",
  descricaoorgao: "Descrição do órgão", descricaosubfuncao: "Descrição da subfunção", descricaouo: "Descrição da unidade orçamentária",
  disponivel: "Disponível", dotacaoatual: "Dotação atual", dotacaoinicial: "Dotação inicial",
  emp_liq_inscr_rap_np: "EMP_LIQ_INSCR_RAP_NP", empenhado: "Empenhado", empenhoaliquidar: "Empenho a liquidar", empenholiquidado: "Empenho liquidado",
  esfera: "Esfera", funcao: "Função", localizador: "Localizador", orgao: "Órgão", pago: "Pago",
  pidescricao: "Descrição do plano interno", plano_interno: "Plano interno", programa: "Programa", projetolei: "Projeto de lei",
  rapapagar: "Restos a pagar • a pagar", rapcancelados: "Restos a pagar • cancelados", rapexerciciosanteriores: "Restos a pagar • exercícios anteriores",
  rapinscrito: "Restos a pagar • inscritos", rappago: "Restos a pagar • pagos", rp_atual: "Resultado primário atual", rp_lei: "Resultado primário na lei",
  subfuncao: "Subfunção", tituloacao: "Título da ação", tituloprograma: "Título do programa", uo: "Unidade orçamentária",
};
export const STATUS_CONSULTA_SIOP: Record<string, string> = {
  PENDENTE: "Em andamento", CONCLUIDA: "Concluída", RECUSADA: "Recusada pelo SIOP", FALHOU: "Falhou",
};
