/**
 * Nomes dos eventos de domínio. São o contrato com CRM, Planner, mensageria e
 * n8n: quem consome lê `docs/EVENTOS-DE-DOMINIO.md`, que é gerado daqui.
 */
export const EVENTOS = {
  DemandaCriada: "DemandaCriada",
  DemandaAtribuida: "DemandaAtribuida",
  DemandaStatusAlterado: "DemandaStatusAlterado",
  DocumentoSolicitado: "DocumentoSolicitado",
  DocumentoEnviado: "DocumentoEnviado",
  DocumentoRemovido: "DocumentoRemovido",
  ValidacaoFalhou: "ValidacaoFalhou",
  DemandaPronta: "DemandaPronta",
  AutomacaoIniciada: "AutomacaoIniciada",
  AutomacaoPausada: "AutomacaoPausada",
  AutomacaoFalhou: "AutomacaoFalhou",
  AutomacaoConcluida: "AutomacaoConcluida",
  SIMILPreparado: "SIMILPreparado",
  SIMILConcluido: "SIMILConcluido",
  RAEGerado: "RAEGerado",
  SIOPIConcluido: "SIOPIConcluido",
  AprovacaoSolicitada: "AprovacaoSolicitada",
  AprovacaoConcedida: "AprovacaoConcedida",
  AprovacaoRejeitada: "AprovacaoRejeitada",
  PrazoEmRisco: "PrazoEmRisco",
  DemandaEntregue: "DemandaEntregue",
} as const;

export type NomeEvento = (typeof EVENTOS)[keyof typeof EVENTOS];
