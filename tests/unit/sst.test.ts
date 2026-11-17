import { describe, expect, it } from "vitest";
import { calcularVencimento, ordemServicoSchema, participantePertenceAoTenant, treinamentoSchema } from "@/dominio/sst";

describe("SST", () => {
  it("calcula a validade do certificado em meses", () => {
    expect(calcularVencimento(new Date("2026-01-31T12:00:00Z"), 1).toISOString()).toBe("2026-02-28T12:00:00.000Z");
  });

  it("recusa participante de outro tenant", () => {
    expect(participantePertenceAoTenant("empresa-a", "empresa-b")).toBe(false);
  });

  it("aceita validade vazia como não informada", () => {
    expect(treinamentoSchema.parse({ titulo: "NR 10", inicio: "2026-11-16T10:00", validadeMeses: "" }).validadeMeses).toBeUndefined();
  });

  it("valida ordem de serviço completa", () => {
    expect(ordemServicoSchema.parse({ funcionarioId: "func-1", numero: "OS-2026-001", emitidaEm: "2026-11-17", atividades: "Operar máquina", riscos: "Ruído", medidas: "Proteção coletiva", epis: "Protetor auricular" }).numero).toBe("OS-2026-001");
    expect(() => ordemServicoSchema.parse({ funcionarioId: "func-1", numero: "OS", emitidaEm: "2026-11-17", atividades: "", riscos: "", medidas: "" })).toThrow();
  });
});
