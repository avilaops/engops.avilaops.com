import { describe, expect, it } from "vitest";
import { chaveEnvioCertificado, proximaTentativaEmail } from "@/servicos/fila-email-sst";

describe("fila de e-mail SST", () => {
  it("cria chave idempotente por certificado, versão e destinatário", () => {
    expect(chaveEnvioCertificado("cert-1", 3, "NICOLAS@EXAMPLE.TEST")).toBe("certificado:cert-1:v3:nicolas@example.test");
  });

  it("agenda repetição exponencial e encerra após cinco falhas", () => {
    const agora = new Date("2026-11-17T12:00:00Z");
    expect(proximaTentativaEmail(1, agora)?.toISOString()).toBe("2026-11-17T12:01:00.000Z");
    expect(proximaTentativaEmail(4, agora)?.toISOString()).toBe("2026-11-17T12:08:00.000Z");
    expect(proximaTentativaEmail(5, agora)).toBeNull();
  });
});
