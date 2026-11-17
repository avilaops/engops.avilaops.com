import { describe, expect, it, vi } from "vitest";
import { chaveCertificadoSst, chaveListaSst, chaveOrdemSst, persistirPdfSst } from "@/servicos/storage-sst";

describe("storage SST", () => {
  it("isola certificados e listas pelo tenant", () => {
    expect(chaveCertificadoSst("empresa-a", "CERT-2026-001", "emissao-1")).toBe("engops/empresa-a/sst/certificados/CERT-2026-001-emissao-1.pdf");
    expect(chaveCertificadoSst("empresa-a", "CERT-2026-001", "emissao-2")).not.toBe(chaveCertificadoSst("empresa-a", "CERT-2026-001", "emissao-1"));
    expect(chaveListaSst("empresa-b", "treino-1")).toBe("engops/empresa-b/sst/listas/treino-1.pdf");
    expect(chaveOrdemSst("empresa-a", "cliente-a", "OS/2026/1")).toBe("engops/empresa-a/sst/ordens/cliente-a-OS-2026-1.pdf");
  });

  it("registra somente depois que o PDF foi armazenado", async () => {
    const ordem: string[] = [];
    const gravar = vi.fn(async (chave: string) => { ordem.push(`gravar:${chave}`); return `local:${chave}`; });
    const registrar = vi.fn(async (chave: string) => { ordem.push(`registrar:${chave}`); return chave; });
    await expect(persistirPdfSst({ chave: "engops/e/sst/a.pdf", bytes: new Uint8Array([1]), registrar }, gravar)).resolves.toBe("local:engops/e/sst/a.pdf");
    expect(ordem).toEqual(["gravar:engops/e/sst/a.pdf", "registrar:local:engops/e/sst/a.pdf"]);
  });

  it("não registra quando o armazenamento falha", async () => {
    const registrar = vi.fn();
    const gravar = vi.fn(async () => { throw new Error("R2 indisponível"); });
    await expect(persistirPdfSst({ chave: "engops/e/sst/a.pdf", bytes: new Uint8Array([1]), registrar }, gravar)).rejects.toThrow("R2 indisponível");
    expect(registrar).not.toHaveBeenCalled();
  });

  it("remove o PDF armazenado quando o registro no banco falha", async () => {
    const remover = vi.fn(async () => undefined);
    const gravar = vi.fn(async () => "engops/e/sst/a.pdf");
    const registrar = vi.fn(async () => { throw new Error("banco indisponível"); });
    await expect(persistirPdfSst({ chave: "engops/e/sst/a.pdf", bytes: new Uint8Array([1]), registrar }, gravar, remover)).rejects.toThrow("banco indisponível");
    expect(remover).toHaveBeenCalledWith("engops/e/sst/a.pdf");
  });
});
