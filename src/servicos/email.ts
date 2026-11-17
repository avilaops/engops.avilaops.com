export type AnexoEmail = { nome: string; mime: string; base64: string };

export function emailSstConfigurado() { return Boolean((process.env.ENGOPS_EMAIL_WEBHOOK_URL && process.env.ENGOPS_EMAIL_WEBHOOK_TOKEN) || (process.env.RESEND_API_KEY && process.env.EMAIL_FROM)); }

export async function enviarEmailWebhook(entrada: { url: string; token: string; para: string; assunto: string; texto: string; anexos: AnexoEmail[] }) {
  const resposta = await fetch(entrada.url, { method: "POST", headers: { "content-type": "application/json", "x-avila-webhook-token": entrada.token }, body: JSON.stringify({ para: entrada.para, assunto: entrada.assunto, texto: entrada.texto, nomeDe: "EngOps • GRB", anexos: entrada.anexos }), signal: AbortSignal.timeout(20_000) });
  const retorno = await resposta.json();
  if (!resposta.ok || retorno?.ok !== true || typeof retorno.messageId !== "string" || !retorno.messageId) throw new Error("O envio não foi confirmado pelo servidor de e-mail.");
  return { messageId: retorno.messageId as string };
}

type EntradaEmail = { para: string; assunto: string; texto: string; anexos: AnexoEmail[] };

export async function enviarEmailSst(entrada: EntradaEmail) {
  const url = process.env.ENGOPS_EMAIL_WEBHOOK_URL; const token = process.env.ENGOPS_EMAIL_WEBHOOK_TOKEN;
  if (url && token) return enviarEmailWebhook({ ...entrada, url, token });
  const apiKey = process.env.RESEND_API_KEY; const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) throw new Error("O envio de documentos por e-mail ainda não está configurado.");
  const resposta = await fetch("https://api.resend.com/emails", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` }, body: JSON.stringify({ from, to: [entrada.para], subject: entrada.assunto, text: entrada.texto, attachments: entrada.anexos.map(anexo => ({ filename: anexo.nome, content: anexo.base64 })) }), signal: AbortSignal.timeout(20_000) });
  const retorno = await resposta.json();
  if (!resposta.ok || typeof retorno?.id !== "string" || !retorno.id) throw new Error("O envio não foi confirmado pelo servidor de e-mail.");
  return { messageId: retorno.id as string };
}
