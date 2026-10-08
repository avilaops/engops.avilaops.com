import type { ModoAutomacao, NivelEvento } from "@prisma/client";

/**
 * O motor de automação (Automation Engine) é genérico: sabe executar um
 * workflow de etapas, retomar de onde parou, pausar para gente, registrar
 * cada passo e falhar com erro tipado. Ele NÃO sabe o que é SIMIL. Quem sabe
 * é o adapter em `src/automation/adapters/`.
 */

export type ContextoJob = Record<string, unknown>;

export type Registrador = (mensagem: string, nivel?: NivelEvento, dados?: Record<string, unknown>) => Promise<void>;

export type AmbienteEtapa = {
  jobId: string;
  empresaId: string;
  demandaId: string | null;
  modo: ModoAutomacao;
  criadoPor: string;
  /** Estado que atravessa as etapas. Mutável de propósito: cada etapa acrescenta o que produziu. */
  contexto: ContextoJob;
  registrar: Registrador;
};

/** O que uma etapa devolve. `pausar` põe o job em WAITING_USER. */
export type ResultadoEtapa =
  | { tipo: "ok" }
  | { tipo: "pausar"; motivo: string }
  | { tipo: "concluir"; resultado?: Record<string, unknown> };

export type Etapa = {
  nome: string;
  /** Etapa idempotente: rodar duas vezes com o mesmo contexto dá o mesmo efeito. */
  executar: (amb: AmbienteEtapa) => Promise<ResultadoEtapa>;
};

export type Workflow = {
  nome: string;
  rotulo: string;
  etapas: Etapa[];
  /** Erros com estes códigos não valem retry (dado faltando, sem aprovação). */
  naoRetentar?: string[];
};

export type PedidoJob = {
  empresaId: string;
  demandaId?: string;
  workflow: string;
  /** Uma intenção, um job: "preparar-simil:<demandaId>:<versão dos dados>". */
  chaveIdempotencia: string;
  modo: ModoAutomacao;
  criadoPor: string;
  contexto?: ContextoJob;
  prioridade?: number;
};
