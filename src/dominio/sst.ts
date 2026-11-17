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
import { z } from "zod";

export const treinamentoSchema = z.object({
  titulo: z.string().trim().min(2),
  inicio: z.coerce.date(),
  normaId: z.string().optional(),
  instrutor: z.string().optional(),
  validadeMeses: z.preprocess((valor) => valor === "" ? undefined : valor, z.coerce.number().int().positive().optional()),
});

export const ordemServicoSchema = z.object({
  funcionarioId: z.string().min(1),
  numero: z.string().trim().min(4).max(80),
  emitidaEm: z.coerce.date(),
  atividades: z.string().trim().min(2),
  riscos: z.string().trim().min(2),
  medidas: z.string().trim().min(2),
  epis: z.string().trim().optional(),
});

