import { afterEach, describe, expect, it, vi } from "vitest";
import { emailSstConfigurado, enviarEmailSst, enviarEmailWebhook } from "@/servicos/email";

describe("e-mail de documentos SST", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("envia anexo PDF e exige confirmação do provedor", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true, messageId: "msg-1" }) }); vi.stubGlobal("fetch", fetchMock);
    await expect(enviarEmailWebhook({ url: "https://example.test/email", token: "token", para: "ana@example.test", assunto: "Certificado", texto: "Segue certificado.", anexos: [{ nome: "certificado.pdf", mime: "application/pdf", base64: "JVBERi0=" }] })).resolves.toEqual({ messageId: "msg-1" });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).anexos[0].nome).toBe("certificado.pdf");
  });

  it("usa Resend diretamente quando configurado", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: "resend-1" }) }); vi.stubGlobal("fetch", fetchMock);
    const anterior = { key: process.env.RESEND_API_KEY, from: process.env.EMAIL_FROM, url: process.env.ENGOPS_EMAIL_WEBHOOK_URL, token: process.env.ENGOPS_EMAIL_WEBHOOK_TOKEN };
    delete process.env.ENGOPS_EMAIL_WEBHOOK_URL; delete process.env.ENGOPS_EMAIL_WEBHOOK_TOKEN; process.env.RESEND_API_KEY = "re_test"; process.env.EMAIL_FROM = "GRB <sst@example.test>";
    try {
      expect(emailSstConfigurado()).toBe(true);
      await expect(enviarEmailSst({ para: "ana@example.test", assunto: "Certificado", texto: "Segue certificado.", anexos: [{ nome: "certificado.pdf", mime: "application/pdf", base64: "JVBERi0=" }] })).resolves.toEqual({ messageId: "resend-1" });
      expect(fetchMock.mock.calls[0][0]).toBe("https://api.resend.com/emails");
    } finally {
      Object.assign(process.env, { RESEND_API_KEY: anterior.key, EMAIL_FROM: anterior.from, ENGOPS_EMAIL_WEBHOOK_URL: anterior.url, ENGOPS_EMAIL_WEBHOOK_TOKEN: anterior.token });
      for (const chave of ["RESEND_API_KEY", "EMAIL_FROM", "ENGOPS_EMAIL_WEBHOOK_URL", "ENGOPS_EMAIL_WEBHOOK_TOKEN"] as const) if (process.env[chave] === undefined || process.env[chave] === "undefined") delete process.env[chave];
    }
  });

  it("recusa resposta sem confirmação", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: false }) }));
    await expect(enviarEmailWebhook({ url: "https://example.test/email", token: "token", para: "ana@example.test", assunto: "Certificado", texto: "Segue certificado.", anexos: [] })).rejects.toThrow(/confirmado/);
  });
});
