import { describe, expect, it } from "vitest";
import { resolverImagemDocumento } from "@/servicos/imagens-documentos";

describe("imagens dos documentos SST", () => {
  it("incorpora imagem pública local como data URI", async () => {
    const url = await resolverImagemDocumento("/grb-simbolo.png");
    expect(url).toMatch(/^data:image\/png;base64,/);
  });

  it("não permite caminho externo ou travessia", async () => {
    await expect(resolverImagemDocumento("https://example.test/logo.png")).rejects.toThrow();
    await expect(resolverImagemDocumento("/../.env")).rejects.toThrow();
  });
});
