import { prisma } from "@/lib/prisma";
import type { Intervalo } from "@/dominio/agenda";

export type EventoAgenda = { id: string; tipo: "COMPROMISSO" | "TREINAMENTO" | "VENCIMENTO"; titulo: string; inicio: Date };

export async function eventosDaAgenda(empresaId: string, intervalo: Intervalo): Promise<EventoAgenda[]> {
  const [compromissos, treinamentos, certificados] = await Promise.all([
    prisma.compromissoAgenda.findMany({ where: { empresaId, inicio: { gte: intervalo.inicio, lt: intervalo.fim } } }),
    prisma.treinamentoSst.findMany({ where: { empresaId, inicio: { gte: intervalo.inicio, lt: intervalo.fim } } }),
    prisma.certificadoSst.findMany({ where: { empresaId, venceEm: { gte: intervalo.inicio, lt: intervalo.fim } }, include: { participante: { include: { funcionario: true } } } }),
  ]);
  return [
    ...compromissos.map((item) => ({ id: item.id, tipo: "COMPROMISSO" as const, titulo: item.titulo, inicio: item.inicio })),
    ...treinamentos.map((item) => ({ id: item.id, tipo: "TREINAMENTO" as const, titulo: item.titulo, inicio: item.inicio })),
    ...certificados.filter((item): item is typeof item & { venceEm: Date } => Boolean(item.venceEm)).map((item) => ({ id: item.id, tipo: "VENCIMENTO" as const, titulo: `Certificado • ${item.participante.funcionario.nome}`, inicio: item.venceEm })),
  ].sort((a, b) => a.inicio.getTime() - b.inicio.getTime());
}
