import { describe, expect, it } from "vitest";
import { agruparEventosPorDia, chaveDataOperacional, compromissoAgendaSchema, diasDoCalendario, fontesDaAgenda, intervaloDoMes, mesAtualSaoPaulo, pertenceAoIntervalo } from "@/dominio/agenda";

describe("agenda", () => {
  it("cria intervalo mensal semiaberto", () => {
    const intervalo = intervaloDoMes(2026, 11);
    expect(intervalo.inicio.toISOString()).toBe("2026-11-01T03:00:00.000Z");
    expect(intervalo.fim.toISOString()).toBe("2026-12-01T03:00:00.000Z");
  });

  it("agrupa pelo dia operacional de São Paulo", () => {
    expect(chaveDataOperacional(new Date("2026-12-01T02:00:00Z"))).toBe("2026-11-30");
    expect(agruparEventosPorDia([{ id: "1", inicio: new Date("2026-12-01T02:00:00Z") }]).get("2026-11-30")?.[0]?.id).toBe("1");
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

  it("interpreta datetime-local no fuso de São Paulo", () => {
    expect(compromissoAgendaSchema.parse({ clienteId: "c1", titulo: "Reunião", inicio: "2026-11-17T08:30" }).inicio.toISOString()).toBe("2026-11-17T11:30:00.000Z");
  });

  it("obtém ano e mês operacional em São Paulo", () => {
    expect(mesAtualSaoPaulo(new Date("2027-01-01T01:30:00Z"))).toEqual({ ano: 2026, mes: 12 });
  });
});
