import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { pode, type Acao } from "@/lib/rbac";
import { EVENTOS } from "@/dominio/eventos";

/** Apenas eventos acionáveis; nenhum payload externo é usado como HTML ou URL. */
export async function notificarEvento(tx: Prisma.TransactionClient, empresaId: string, nome: string, payload: Record<string, unknown>) {
  let aviso: { titulo: string; corpo: string; link: string; acao: Acao };
  if (nome === EVENTOS.AprovacaoSolicitada) {
    aviso = { titulo: "Uma preparação aguarda aprovação", corpo: "Revise os dados preparados antes de aprovar ou recusar.", link: "/aprovacoes", acao: "automacao.aprovar" };
  } else if (nome === EVENTOS.AutomacaoFalhou) {
    aviso = { titulo: "Uma automação falhou", corpo: "Consulte a execução para conferir a causa e a próxima ação.", link: typeof payload.jobId === "string" && payload.jobId ? `/automacoes/${encodeURIComponent(payload.jobId)}` : "/automacoes", acao: "automacao.executar" };
  } else {
    return;
  }
  const membros = await tx.membro.findMany({ where: { empresaId, ativo: true }, select: { email: true, papel: true } });
  const destinatarios = [...new Set(membros.filter((m) => pode(m.papel, aviso.acao)).map((m) => m.email.trim().toLowerCase()).filter(Boolean))];
  if (!destinatarios.length) return;
  await tx.notificacao.createMany({ data: destinatarios.map((destinatario) => ({ empresaId, destinatario, titulo: aviso.titulo, corpo: aviso.corpo, link: aviso.link })) });
}

export async function listarNotificacoes(empresaId: string, email: string, pagina: number, apenasNaoLidas: boolean) {
  const where = { empresaId, destinatario: email.toLowerCase(), ...(apenasNaoLidas ? { lidaEm: null } : {}) };
  const [itens, total, naoLidas] = await Promise.all([
    prisma.notificacao.findMany({ where, orderBy: [{ criadoEm: "desc" }, { id: "desc" }], skip: (pagina - 1) * 30, take: 30 }),
    prisma.notificacao.count({ where }),
    prisma.notificacao.count({ where: { empresaId, destinatario: email.toLowerCase(), lidaEm: null } }),
  ]);
  return { itens, total, naoLidas };
}

export async function marcarNotificacaoLida(empresaId: string, email: string, id: string) {
  // updateMany permite filtrar simultaneamente ID, empresa e destinatário.
  return prisma.notificacao.updateMany({
    where: { id, empresaId, destinatario: email.toLowerCase(), lidaEm: null },
    data: { lidaEm: new Date() },
  });
}
