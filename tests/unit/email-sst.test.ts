import { afterEach, describe, expect, it, vi } from "vitest";
import { enviarEmailWebhook } from "@/servicos/email";

describe("e-mail de documentos SST", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("envia anexo PDF e exige confirmação do provedor", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true, messageId: "msg-1" }) }); vi.stubGlobal("fetch", fetchMock);
    await expect(enviarEmailWebhook({ url: "https://example.test/email", token: "token", para: "ana@example.test", assunto: "Certificado", texto: "Segue certificado.", anexos: [{ nome: "certificado.pdf", mime: "application/pdf", base64: "JVBERi0=" }] })).resolves.toEqual({ messageId: "msg-1" });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).anexos[0].nome).toBe("certificado.pdf");
  });

  it("recusa resposta sem confirmação", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: false }) }));
    await expect(enviarEmailWebhook({ url: "https://example.test/email", token: "token", para: "ana@example.test", assunto: "Certificado", texto: "Segue certificado.", anexos: [] })).rejects.toThrow(/confirmado/);
  });
});
