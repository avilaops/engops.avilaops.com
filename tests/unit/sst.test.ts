import { describe, expect, it } from "vitest";
import { calcularVencimento, participantePertenceAoTenant } from "@/dominio/sst";

describe("SST", () => {
  it("calcula a validade do certificado em meses", () => {
    expect(calcularVencimento(new Date("2026-01-31T12:00:00Z"), 1).toISOString()).toBe("2026-02-28T12:00:00.000Z");
  });

  it("recusa participante de outro tenant", () => {
    expect(participantePertenceAoTenant("empresa-a", "empresa-b")).toBe(false);
  });
});
