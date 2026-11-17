import { describe, expect, it } from "vitest";
import { chaveAlertaSst, chaveAlertaTreinamento, diasAteVencimento, deveAlertarTreinamento, deveAlertarVencimento } from "@/servicos/alertas-sst";

describe("alertas de vencimento SST", () => {
  it("dispara nas janelas de 30, 7, 1 e 0 dias", () => {
    expect([31, 30, 8, 7, 1, 0, -1].filter(deveAlertarVencimento)).toEqual([30, 7, 1, 0]);
  });

  it("calcula dias no fuso operacional e gera chave idempotente", () => {
    expect(diasAteVencimento(new Date("2026-11-17T15:00:00Z"), new Date("2026-11-24T03:00:00Z"))).toBe(7);
    expect(chaveAlertaSst("cert-1", 2, new Date("2026-11-24T03:00:00Z"), "nicolas@example.test", 7)).toBe("sst:certificado:cert-1:v2:2026-11-24:7:nicolas@example.test");
  });

  it("lembra treinamentos planejados em 7, 1 e 0 dias", () => {
    expect([8, 7, 2, 1, 0, -1].filter(deveAlertarTreinamento)).toEqual([7, 1, 0]);
    expect(chaveAlertaTreinamento("t1", new Date("2026-11-24T11:00:00Z"), "GESTOR@EXAMPLE.TEST", 7)).toBe("sst:treinamento:t1:2026-11-24:7:gestor@example.test");
  });
});
