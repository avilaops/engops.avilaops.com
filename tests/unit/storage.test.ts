import { afterEach, describe, expect, it, vi } from "vitest";
import { gravarArquivo } from "@/lib/storage";

describe("storage", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("recusa fallback local em produção quando o R2 está incompleto", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("R2_BUCKET", ""); vi.stubEnv("CLOUDFLARE_ACCOUNT_ID", ""); vi.stubEnv("R2_ACCESS_KEY_ID", ""); vi.stubEnv("R2_SECRET_ACCESS_KEY", "");
    await expect(gravarArquivo("engops/e/a.pdf", Buffer.from("pdf"), "application/pdf")).rejects.toThrow(/R2.*produção/);
  });
});
