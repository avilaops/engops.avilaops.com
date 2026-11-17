export function calcularVencimento(emissao: Date, validadeMeses: number): Date {
  const resultado = new Date(emissao);
  const dia = resultado.getUTCDate();
  resultado.setUTCDate(1);
  resultado.setUTCMonth(resultado.getUTCMonth() + validadeMeses);
  const ultimoDia = new Date(Date.UTC(resultado.getUTCFullYear(), resultado.getUTCMonth() + 1, 0)).getUTCDate();
  resultado.setUTCDate(Math.min(dia, ultimoDia));
  return resultado;
}

export function participantePertenceAoTenant(empresaId: string, empresaDoFuncionarioId: string): boolean {
  return empresaId === empresaDoFuncionarioId;
}

type StatusTreinamentoDominio = "PLANEJADO" | "REALIZADO" | "CANCELADO";
export function transicaoTreinamentoPermitida(atual: StatusTreinamentoDominio, proximo: StatusTreinamentoDominio) {
  return atual === proximo || (atual === "PLANEJADO" && (proximo === "REALIZADO" || proximo === "CANCELADO"));
}
type StatusOrdemDominio = "RASCUNHO" | "EMITIDA" | "ASSINADA" | "CANCELADA";
export function transicaoOrdemServicoPermitida(atual: StatusOrdemDominio, proximo: StatusOrdemDominio) {
  if (atual === proximo) return true;
  if (proximo === "CANCELADA") return atual !== "CANCELADA";
  return (atual === "RASCUNHO" && proximo === "EMITIDA") || (atual === "EMITIDA" && proximo === "ASSINADA");
}
import { z } from "zod";

export const treinamentoSchema = z.object({
  clienteId: z.string().min(1),
  titulo: z.string().trim().min(2),
  inicio: z.preprocess(valor => typeof valor === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(valor) ? `${valor}${valor.length === 16 ? ":00" : ""}-03:00` : valor, z.coerce.date()),
  normaId: z.string().optional(),
  instrutor: z.string().optional(),
  validadeMeses: z.preprocess((valor) => valor === "" ? undefined : valor, z.coerce.number().int().positive().optional()),
  cargaHorariaMin: z.preprocess((valor) => valor === "" ? undefined : valor, z.coerce.number().int().positive().optional()),
});

export const atualizacaoTreinamentoSchema = treinamentoSchema.extend({ treinamentoId: z.string().min(1) });
export const presencaEmMassaSchema = z.object({ treinamentoId: z.string().min(1), resultado: z.enum(["PRESENTE_APROVADO", "PRESENTE", "AUSENTE"]) });

export const normaSchema = z.object({
  codigo: z.string().trim().transform((valor, contexto) => {
    const correspondencia = valor.toUpperCase().match(/^NR[\s-]*0*(\d{1,2})$/);
    const numero = correspondencia ? Number(correspondencia[1]) : Number.NaN;
    if (!Number.isInteger(numero) || numero < 1 || numero > 38) {
      contexto.addIssue({ code: z.ZodIssueCode.custom, message: "Informe uma NR entre 01 e 38." });
      return z.NEVER;
    }
    return `NR-${String(numero).padStart(2, "0")}`;
  }),
  titulo: z.string().trim().min(2),
});

export const ordemServicoSchema = z.object({
  clienteId: z.string().min(1),
  funcionarioId: z.string().min(1),
  numero: z.string().trim().min(4).max(80),
  emitidaEm: z.coerce.date(),
  atividades: z.string().trim().min(2),
  riscos: z.string().trim().min(2),
  medidas: z.string().trim().min(2),
  epis: z.string().trim().optional(),
});

export const invalidacaoCertificadoSchema = z.object({ participanteId: z.string().min(1), motivo: z.string().trim().min(10).max(500) });

export const atualizacaoConteudoNormaSchema = z.object({
  normaId: z.string().min(1),
  textoReferencia: z.string().trim().min(3).max(12000),
});

