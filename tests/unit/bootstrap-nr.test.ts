import { describe, expect, it } from "vitest";
import { sincronizarCatalogoNr } from "@/servicos/bootstrap-nr";

describe("bootstrap do catálogo NR", () => {
  it("sincroniza as 38 normas de forma idempotente", async () => {
    const registros = new Map<string, { codigo: string; titulo: string; ativo: boolean; textoReferencia: string }>();
    const repositorio = {
      upsert: async (item: { codigo: string; titulo: string; ativo: boolean; textoReferencia: string }) => void registros.set(item.codigo, item),
    };
    await sincronizarCatalogoNr(repositorio);
    await sincronizarCatalogoNr(repositorio);
    expect(registros).toHaveLength(38);
    expect(registros.get("NR-02")?.ativo).toBe(false);
    expect(registros.get("NR-27")?.ativo).toBe(false);
    expect(JSON.parse(registros.get("NR-35")!.textoReferencia)).toHaveProperty("conteudoProgramatico");
  });
});
