import { prisma } from "@/lib/prisma";

/**
 * Entrega os eventos de domínio ao n8n. É o n8n que decide o que fazer com
 * cada um (avisar por WhatsApp, criar tarefa, atualizar o CRM). O código de
 * negócio nunca chama o n8n direto: grava na outbox e este entregador cuida.
 *
 * Sem `N8N_WEBHOOK_URL` os eventos ficam na tabela, consultáveis, e nada é
 * perdido: quando a URL entrar, a fila esvazia.
 */
export async function entregarEventos(limite = 50): Promise<number> {
  const url = process.env.N8N_WEBHOOK_URL;
  if (!url) return 0;

  const pendentes = await prisma.eventoDominio.findMany({
    where: { entregueEm: null, tentativas: { lt: 10 } },
    orderBy: { criadoEm: "asc" },
    take: limite,
    include: { empresa: { select: { slug: true, nome: true } } },
  });

  let entregues = 0;
  for (const ev of pendentes) {
    try {
      const resposta = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-avila-webhook-token": process.env.N8N_WEBHOOK_TOKEN ?? "",
        },
        body: JSON.stringify({
          id: ev.id,
          evento: ev.nome,
          empresa: { id: ev.empresaId, slug: ev.empresa.slug, nome: ev.empresa.nome },
          payload: ev.payload,
          criadoEm: ev.criadoEm.toISOString(),
        }),
        signal: AbortSignal.timeout(15_000),
      });
      if (!resposta.ok) throw new Error(`n8n respondeu ${resposta.status}`);
      await prisma.eventoDominio.update({ where: { id: ev.id }, data: { entregueEm: new Date(), erro: null } });
      entregues += 1;
    } catch (e) {
      await prisma.eventoDominio.update({
        where: { id: ev.id },
        data: { tentativas: { increment: 1 }, erro: e instanceof Error ? e.message : String(e) },
      });
    }
  }
  return entregues;
}
