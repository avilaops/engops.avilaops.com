import { describe, expect, it } from "vitest";
import { validarVinculoRh } from "@/dominio/escopo-rh";

describe("escopo do RH por empresa cliente", () => {
  it("aceita setor e cargo do mesmo tenant e cliente", () => {
    expect(() => validarVinculoRh(
      { empresaId: "grb", clienteId: "arm" },
      { empresaId: "grb", clienteId: "arm" },
      { empresaId: "grb", clienteId: "arm" },
    )).not.toThrow();
  });

  it("rejeita vínculo cruzado entre clientes do mesmo tenant", () => {
    expect(() => validarVinculoRh(
      { empresaId: "grb", clienteId: "arm" },
      { empresaId: "grb", clienteId: "drg" },
      { empresaId: "grb", clienteId: "arm" },
    )).toThrow("Setor ou cargo não pertence à empresa cliente selecionada.");
  });

  it("rejeita vínculo de outro tenant", () => {
    expect(() => validarVinculoRh(
      { empresaId: "grb", clienteId: "arm" },
      { empresaId: "outro", clienteId: "arm" },
      { empresaId: "grb", clienteId: "arm" },
    )).toThrow("Setor ou cargo não pertence à empresa cliente selecionada.");
  });
});
