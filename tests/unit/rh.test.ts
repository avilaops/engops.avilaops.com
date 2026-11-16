import { describe, expect, it } from "vitest";
import { funcionarioSchema } from "@/dominio/rh";

describe("RH", () => {
  it("normaliza CPF e exige nome, setor e cargo", () => {
    const valor = funcionarioSchema.parse({ nome: "  Ana Silva ", cpf: "123.456.789-09", setorId: "setor-1", cargoId: "cargo-1" });
    expect(valor).toMatchObject({ nome: "Ana Silva", cpf: "12345678909" });
  });

  it("rejeita CPF com tamanho inválido", () => {
    expect(() => funcionarioSchema.parse({ nome: "Ana", cpf: "123", setorId: "s", cargoId: "c" })).toThrow();
  });
});
