import { describe, expect, it } from "vitest";
import { CATALOGO_NR, obterNr } from "@/dominio/catalogo-nr";

describe("catálogo das Normas Regulamentadoras", () => {
  it("contém exatamente as NR 01 a 38", () => {
    expect(CATALOGO_NR).toHaveLength(38);
    expect(CATALOGO_NR.map(item => item.codigo)).toEqual(Array.from({ length: 38 }, (_, indice) => `NR-${String(indice + 1).padStart(2, "0")}`));
  });

  it("marca NR 02 e NR 27 como revogadas e não emitíveis", () => {
    expect(obterNr("NR-02")).toMatchObject({ vigente: false, permiteCertificado: false });
    expect(obterNr("NR 27")).toMatchObject({ vigente: false, permiteCertificado: false });
    expect(obterNr("nr-35")).toMatchObject({ vigente: true, permiteCertificado: true });
  });

  it("fornece título e conteúdo programático para cada norma", () => {
    for (const norma of CATALOGO_NR) {
      expect(norma.titulo.length).toBeGreaterThan(5);
      expect(norma.conteudoProgramatico.length).toBeGreaterThan(0);
      expect(norma.conteudoProgramatico[0]).toContain(norma.titulo.replace(" • revogada", ""));
    }
  });
});
