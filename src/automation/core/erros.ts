/**
 * Erros tipados. "Erro inesperado" não ajuda ninguém: o operador precisa saber
 * o que aconteceu, onde, o motivo provável, o que o sistema fez e se pode
 * tentar de novo. Tudo isso mora aqui, por código.
 */

export type CodigoErro =
  | "MISSING_REQUIRED_DATA"
  | "VALIDATION_BLOCKED"
  | "APPROVAL_REJECTED"
  | "APPROVAL_PENDING"
  | "DOCUMENT_INVALID"
  | "SIMIL_FIELD_NOT_FOUND"
  | "SIMIL_AUTH_EXPIRED"
  | "SIOPI_AUTH_EXPIRED"
  | "SIOPI_TIMEOUT"
  | "RAE_VALIDATION_FAILED"
  | "NETWORK_TIMEOUT"
  | "INTEGRATION_BROKEN"
  | "DRIVER_NOT_AVAILABLE"
  | "SHADOW_MODE"
  | "WORKFLOW_NOT_FOUND"
  | "TENANT_MISMATCH"
  | "UNKNOWN";

export class ErroAutomacao extends Error {
  readonly codigo: CodigoErro;
  readonly retentavel: boolean;
  readonly detalhes?: Record<string, unknown>;

  constructor(codigo: CodigoErro, mensagem: string, opcoes: { retentavel?: boolean; detalhes?: Record<string, unknown> } = {}) {
    super(mensagem);
    this.name = "ErroAutomacao";
    this.codigo = codigo;
    this.retentavel = opcoes.retentavel ?? RETENTAVEIS.has(codigo);
    this.detalhes = opcoes.detalhes;
  }
}

const RETENTAVEIS = new Set<CodigoErro>(["NETWORK_TIMEOUT", "SIOPI_TIMEOUT", "SIMIL_AUTH_EXPIRED", "SIOPI_AUTH_EXPIRED", "UNKNOWN"]);

export type ExplicacaoErro = {
  titulo: string;
  motivo: string;
  oQueOSistemaFez: string;
  oQueFazer: string;
  podeTentarDeNovo: boolean;
};

const EXPLICACOES: Record<CodigoErro, Omit<ExplicacaoErro, "podeTentarDeNovo">> = {
  MISSING_REQUIRED_DATA: {
    titulo: "Faltam dados obrigatórios",
    motivo: "A demanda não tem todos os campos que o sistema externo exige.",
    oQueOSistemaFez: "Parou antes de enviar qualquer coisa.",
    oQueFazer: "Complete o cadastro da demanda e prepare de novo.",
  },
  VALIDATION_BLOCKED: {
    titulo: "Pendências bloqueiam a execução",
    motivo: "Há pendência ou divergência marcada como bloqueante.",
    oQueOSistemaFez: "Não iniciou a etapa externa.",
    oQueFazer: "Resolva as pendências na demanda e tente de novo.",
  },
  APPROVAL_REJECTED: {
    titulo: "Aprovação recusada",
    motivo: "Quem revisou recusou a execução.",
    oQueOSistemaFez: "Cancelou a execução.",
    oQueFazer: "Veja o motivo na aprovação, corrija e prepare de novo.",
  },
  APPROVAL_PENDING: {
    titulo: "Aguardando aprovação",
    motivo: "Esta etapa exige que uma pessoa aprove antes de executar.",
    oQueOSistemaFez: "Pausou o job e avisou quem aprova.",
    oQueFazer: "Abra Aprovações e decida.",
  },
  DOCUMENT_INVALID: {
    titulo: "Documento inválido",
    motivo: "Um documento do dossiê não serve para a etapa (ilegível, vencido ou de outro imóvel).",
    oQueOSistemaFez: "Marcou o documento para revisão.",
    oQueFazer: "Substitua o documento e valide de novo.",
  },
  SIMIL_FIELD_NOT_FOUND: {
    titulo: "Campo do SIMIL não encontrado",
    motivo: "A tela do SIMIL mudou ou o campo esperado não existe mais.",
    oQueOSistemaFez: "Interrompeu a execução sem enviar dados parciais e marcou a integração para verificação.",
    oQueFazer: "Avise a equipe técnica. Enquanto isso, conclua manualmente.",
  },
  SIMIL_AUTH_EXPIRED: {
    titulo: "Sessão do SIMIL expirou",
    motivo: "A credencial ou a sessão usada pela automação venceu.",
    oQueOSistemaFez: "Pausou o job.",
    oQueFazer: "Renove o acesso e retome.",
  },
  SIOPI_AUTH_EXPIRED: {
    titulo: "Sessão do SIOPI expirou",
    motivo: "A credencial ou a sessão usada pela automação venceu.",
    oQueOSistemaFez: "Pausou o job.",
    oQueFazer: "Renove o acesso e retome.",
  },
  SIOPI_TIMEOUT: {
    titulo: "SIOPI não respondeu",
    motivo: "O sistema externo demorou além do limite.",
    oQueOSistemaFez: "Vai tentar de novo automaticamente.",
    oQueFazer: "Aguarde. Se persistir, execute manualmente.",
  },
  RAE_VALIDATION_FAILED: {
    titulo: "RAE não passou na validação",
    motivo: "Um cálculo ou campo do RAE ficou inconsistente com os dados da demanda.",
    oQueOSistemaFez: "Não gerou a versão final.",
    oQueFazer: "Revise os dados apontados e gere de novo.",
  },
  NETWORK_TIMEOUT: {
    titulo: "Rede não respondeu",
    motivo: "Falha de conexão com o sistema externo.",
    oQueOSistemaFez: "Vai tentar de novo automaticamente.",
    oQueFazer: "Aguarde.",
  },
  INTEGRATION_BROKEN: {
    titulo: "Integração comprovadamente quebrada",
    motivo: "O healthcheck da integração falhou. A tela externa provavelmente mudou.",
    oQueOSistemaFez: "Bloqueou novos lotes desta integração.",
    oQueFazer: "Avise a equipe técnica. Execute manualmente enquanto isso.",
  },
  DRIVER_NOT_AVAILABLE: {
    titulo: "Execução real ainda não disponível",
    motivo: "O driver que fala com o sistema externo ainda não foi liberado para esta empresa.",
    oQueOSistemaFez: "Preparou tudo em modo sombra e parou antes de enviar.",
    oQueFazer: "Use os dados preparados para executar manualmente e confirme na demanda.",
  },
  SHADOW_MODE: {
    titulo: "Modo sombra",
    motivo: "Esta empresa está em modo sombra: o sistema prepara mas não envia.",
    oQueOSistemaFez: "Gerou a prévia para comparação.",
    oQueFazer: "Compare com o manual e confirme.",
  },
  WORKFLOW_NOT_FOUND: {
    titulo: "Workflow desconhecido",
    motivo: "O job pede um workflow que este build não conhece.",
    oQueOSistemaFez: "Falhou sem executar.",
    oQueFazer: "Avise a equipe técnica.",
  },
  TENANT_MISMATCH: {
    titulo: "Demanda de outra empresa",
    motivo: "O job aponta para uma demanda que não pertence à empresa do job.",
    oQueOSistemaFez: "Recusou executar.",
    oQueFazer: "Avise a equipe técnica.",
  },
  UNKNOWN: {
    titulo: "Erro não classificado",
    motivo: "Aconteceu algo que o sistema ainda não sabe nomear.",
    oQueOSistemaFez: "Registrou o detalhe técnico e vai tentar de novo.",
    oQueFazer: "Se persistir, avise a equipe técnica com o código do job.",
  },
};

export function explicarErro(codigo: string | null | undefined): ExplicacaoErro {
  const c = (codigo && codigo in EXPLICACOES ? codigo : "UNKNOWN") as CodigoErro;
  return { ...EXPLICACOES[c], podeTentarDeNovo: RETENTAVEIS.has(c) };
}

export function classificarErro(e: unknown): ErroAutomacao {
  if (e instanceof ErroAutomacao) return e;
  const msg = e instanceof Error ? e.message : String(e);
  if (/timeout|ETIMEDOUT|ECONNRESET|fetch failed/i.test(msg)) return new ErroAutomacao("NETWORK_TIMEOUT", msg);
  return new ErroAutomacao("UNKNOWN", msg);
}
