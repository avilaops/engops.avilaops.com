import { prisma } from "@/lib/prisma";
import { auditar } from "@/lib/auditoria";
import { nomeDoPapel } from "@/lib/rbac";

export function conviteConfigurado(): boolean {
  return Boolean(process.env.ENGOPS_CONVITE_WEBHOOK_URL && process.env.ENGOPS_CONVITE_WEBHOOK_TOKEN);
}

export async function enviarConvite(empresaId: string, usuario: string, membroId: string) {
  const url = process.env.ENGOPS_CONVITE_WEBHOOK_URL;
  const token = process.env.ENGOPS_CONVITE_WEBHOOK_TOKEN;
  if (!url || !token) throw new Error("O envio de convites ainda não está configurado.");
  // Serializa envios para o mesmo membro, inclusive entre instâncias do app.
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtext(${empresaId + ":convite:" + membroId}))`;
    const membro = await tx.membro.findFirst({ where: { id: membroId, empresaId, ativo: true }, include: { empresa: { select: { nome: true } } } });
    if (!membro) throw new Error("Membro ativo não encontrado nesta empresa.");
    const recente = await tx.auditoria.findFirst({ where: { empresaId, objetoId: membroId, acao: "membro.convite.solicitado", criadoEm: { gte: new Date(Date.now() - 5 * 60_000) } } });
    if (recente) throw new Error("Aguarde cinco minutos antes de reenviar o convite.");
    await auditar({ empresaId, usuario, acao: "membro.convite.solicitado", objetoTipo: "Membro", objetoId: membroId }, tx);
    const acesso = new URL("/demandas", process.env.APP_BASE_URL || "https://engops.avilaops.com").href;
    const texto = [
      `Olá, ${membro.nome}.`, "",
      `Seu acesso ao EngOps da ${membro.empresa.nome} foi liberado com o papel ${nomeDoPapel(membro.papel)}.`, "",
      `Acesse: ${acesso}`,
      `Entre pelo login único da Ávila Ops usando este e-mail: ${membro.email}.`,
      "Se ainda não possui uma conta, siga as opções de cadastro disponíveis na tela de login.", "",
      "Este convite não contém senha e não altera suas permissões.",
    ].join("\n");
    try {
      const resposta = await fetch(url, {
        method: "POST", headers: { "content-type": "application/json", "x-avila-webhook-token": token },
        body: JSON.stringify({ para: membro.email, assunto: `Convite para o EngOps — ${membro.empresa.nome}`, texto, nomeDe: "EngOps · Ávila Ops" }),
        signal: AbortSignal.timeout(15_000),
      });
      const retorno = await resposta.json();
      if (!resposta.ok || retorno?.ok !== true || typeof retorno.messageId !== "string" || !retorno.messageId) throw new Error("Envio não confirmado");
      await auditar({ empresaId, usuario, acao: "membro.convite.enviado", objetoTipo: "Membro", objetoId: membroId, metadados: { messageId: retorno.messageId } }, tx);
      return { ok: "Convite aceito pelo servidor de e-mail. A entrega na caixa de entrada depende do provedor." };
    } catch {
      await auditar({ empresaId, usuario, acao: "membro.convite.nao-confirmado", objetoTipo: "Membro", objetoId: membroId }, tx);
      return { erro: "O envio não foi confirmado. Confira a caixa de entrada antes de reenviar; aguarde cinco minutos para tentar novamente." };
    }
  }, { timeout: 25000, maxWait: 5000 });
}
