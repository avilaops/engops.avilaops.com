import { describe, expect, it } from "vitest";
import { diasDoCalendario, fontesDaAgenda, intervaloDoMes, pertenceAoIntervalo } from "@/dominio/agenda";

describe("agenda", () => {
  it("cria intervalo mensal semiaberto", () => {
    const intervalo = intervaloDoMes(2026, 11);
    expect(intervalo.inicio.toISOString()).toBe("2026-11-01T00:00:00.000Z");
    expect(intervalo.fim.toISOString()).toBe("2026-12-01T00:00:00.000Z");
  });

  it("não inclui o primeiro instante do mês seguinte", () => {
    const intervalo = intervaloDoMes(2026, 11);
    expect(pertenceAoIntervalo(intervalo.fim, intervalo)).toBe(false);
  });

  it("consulta fontes conforme os módulos ativos", () => {
    expect(fontesDaAgenda(["RH"])).toEqual({ compromissos: true, sst: false });
    expect(fontesDaAgenda(["SST"])).toEqual({ compromissos: false, sst: true });
  });

  it("monta semanas completas para o calendário mensal", () => {
    const dias = diasDoCalendario(2026, 11);
    expect(dias.length % 7).toBe(0);
    expect(dias.some(dia => dia.data === "2026-11-01" && dia.doMes)).toBe(true);
    expect(dias.some(dia => dia.data === "2026-11-30" && dia.doMes)).toBe(true);
  });
});
