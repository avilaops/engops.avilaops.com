import { prisma } from "@/lib/prisma";
import { auditar, emitirEvento } from "@/lib/auditoria";
import { EVENTOS } from "@/dominio/eventos";
import { retomar } from "@/automation/core/fila";
import "@/automation/workflows";

/**
 * Decidir uma aprovação. Aprovar retoma o job que estava esperando; recusar
 * também retoma, e é o próprio workflow que lê a recusa e cancela com o
 * motivo. Assim a decisão e a consequência ficam no mesmo lugar.
 */
export async function decidirAprovacao(id: string, empresaId: string, usuario: string, decisao: "APROVADA" | "REJEITADA", motivo?: string, extras: Record<string, unknown> = {}) {
  const a = await prisma.aprovacao.findFirst({ where: { id, empresaId } });
  if (!a) throw new Error("Aprovação não encontrada");
  if (a.status !== "PENDENTE") return a;
  if (decisao === "REJEITADA" && !motivo?.trim()) throw new Error("Recusar exige motivo");

  const atualizada = await prisma.$transaction(async (tx) => {
    const x = await tx.aprovacao.update({ where: { id }, data: { status: decisao, decididaPor: usuario, decididaEm: new Date(), motivo: motivo?.trim() || null } });
    await auditar({ empresaId, usuario, acao: decisao === "APROVADA" ? "aprovacao.concedida" : "aprovacao.rejeitada", objetoTipo: "Aprovacao", objetoId: id, depois: { tipo: a.tipo, motivo } }, tx);
    await emitirEvento(empresaId, decisao === "APROVADA" ? EVENTOS.AprovacaoConcedida : EVENTOS.AprovacaoRejeitada, { aprovacaoId: id, demandaId: a.demandaId, jobId: a.jobId, tipo: a.tipo, decididaPor: usuario }, tx);
    return x;
  });

  if (a.jobId) await retomar(a.jobId, empresaId, usuario, extras);
  return atualizada;
}
