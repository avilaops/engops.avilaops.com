import { describe, expect, it } from "vitest";
import { gerarCsv } from "@/dominio/csv";

describe("exportação CSV", () => {
  it("preserva acentos, delimitadores, aspas e quebras de linha", () => {
    expect(gerarCsv([["São Paulo; SP", 'OS "12"', "linha\nnova", null]])).toBe('\uFEFF"São Paulo; SP";"OS ""12""";"linha\nnova";""\r\n');
  });
  it.each(["=1+1", "+CMD", "-CMD", "@SUM(A1)", "\t=1", "  +1", "\r@SUM(A1)"])("neutraliza fórmula %j", (texto) => {
    expect(gerarCsv([[texto]])).toBe(`\uFEFF"'${texto}"\r\n`);
  });
});
