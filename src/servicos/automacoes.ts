import { prisma } from "@/lib/prisma";
import { enfileirar } from "@/automation/core/fila";
import "@/automation/workflows";

/**
 * Pedidos de automação vindos da tela. A chave de idempotência inclui o
 * `atualizadoEm` da demanda: mudou o cadastro, é outra preparação; não mudou,
 * o segundo clique acha o job que já existe.
 */
export async function pedirPreparacaoSimil(demandaId: string, empresaId: string, usuario: string) {
  const d = await prisma.demanda.findFirst({ where: { id: demandaId, empresaId }, include: { empresa: { select: { modoAutomacao: true } } } });
  if (!d) throw new Error("Demanda não encontrada");

  const emAndamento = await prisma.job.findFirst({
    where: { demandaId, workflow: "preparar-simil", status: { in: ["QUEUED", "RUNNING", "WAITING_USER", "RETRYING"] } },
  });
  if (emAndamento) return { job: emAndamento, novo: false };

  return enfileirar({
    empresaId,
    demandaId,
    workflow: "preparar-simil",
    modo: d.empresa.modoAutomacao,
    criadoPor: usuario,
    chaveIdempotencia: `preparar-simil:${demandaId}:${d.atualizadoEm.getTime()}`,
  });
}

export async function painelAutomacoes(empresaId: string) {
  const inicioHoje = new Date();
  inicioHoje.setHours(0, 0, 0, 0);
  const [executando, fila, aguardando, concluidasHoje, erros, recentes] = await Promise.all([
    prisma.job.findMany({ where: { empresaId, status: "RUNNING" }, include: { demanda: { select: { codigo: true, id: true } } }, orderBy: { iniciadoEm: "asc" } }),
    prisma.job.count({ where: { empresaId, status: { in: ["QUEUED", "RETRYING"] } } }),
    prisma.job.count({ where: { empresaId, status: "WAITING_USER" } }),
    prisma.job.count({ where: { empresaId, status: "SUCCESS", terminadoEm: { gte: inicioHoje } } }),
    prisma.job.count({ where: { empresaId, status: "FAILED" } }),
    prisma.job.findMany({ where: { empresaId }, include: { demanda: { select: { codigo: true, id: true } } }, orderBy: { criadoEm: "desc" }, take: 50 }),
  ]);
  return { executando, fila, aguardando, concluidasHoje, erros, recentes };
}
