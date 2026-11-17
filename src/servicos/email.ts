export type AnexoEmail = { nome: string; mime: string; base64: string };

export function emailSstConfigurado() { return Boolean(process.env.ENGOPS_EMAIL_WEBHOOK_URL && process.env.ENGOPS_EMAIL_WEBHOOK_TOKEN); }

export async function enviarEmailWebhook(entrada: { url: string; token: string; para: string; assunto: string; texto: string; anexos: AnexoEmail[] }) {
  const resposta = await fetch(entrada.url, { method: "POST", headers: { "content-type": "application/json", "x-avila-webhook-token": entrada.token }, body: JSON.stringify({ para: entrada.para, assunto: entrada.assunto, texto: entrada.texto, nomeDe: "EngOps • GRB", anexos: entrada.anexos }), signal: AbortSignal.timeout(20_000) });
  const retorno = await resposta.json();
  if (!resposta.ok || retorno?.ok !== true || typeof retorno.messageId !== "string" || !retorno.messageId) throw new Error("O envio não foi confirmado pelo servidor de e-mail.");
  return { messageId: retorno.messageId as string };
}
