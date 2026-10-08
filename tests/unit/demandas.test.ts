import { describe, expect, it } from "vitest";
import { COLUNAS_KANBAN, formatarCodigo, podeTransitar, progressoDoStatus, STATUS, transicoesDe } from "@/dominio/demandas";

describe("transições de estado", () => {
  it("permite a jornada feliz inteira", () => {
    const caminho = ["NOVA", "EM_PREPARACAO", "PRONTA_PARA_PROCESSAMENTO", "SIMIL_PENDENTE", "SIMIL_CONCLUIDO", "RAE_PENDENTE", "RAE_CONCLUIDO", "SIOPI_PENDENTE", "EM_CONFERENCIA", "PRONTA_PARA_ENTREGA", "ENTREGUE", "ARQUIVADA"] as const;
    for (let i = 1; i < caminho.length; i++) expect(podeTransitar(caminho[i - 1], caminho[i]), `${caminho[i - 1]} → ${caminho[i]}`).toBe(true);
  });
  it("não deixa pular do início para entregue", () => {
    expect(podeTransitar("NOVA", "ENTREGUE")).toBe(false);
    expect(podeTransitar("NOVA", "SIMIL_CONCLUIDO")).toBe(false);
  });
  it("mesmo estado é sempre permitido", () => {
    for (const [s] of STATUS) expect(podeTransitar(s, s)).toBe(true);
  });
  it("todo estado tem saída (nada fica preso)", () => {
    for (const [s] of STATUS) expect(transicoesDe(s).length, s).toBeGreaterThan(0);
  });
});

describe("kanban", () => {
  it("cobre todos os estados exatamente uma vez", () => {
    const vistos = COLUNAS_KANBAN.flatMap((c) => c.status);
    expect(new Set(vistos).size).toBe(vistos.length);
    expect(vistos.sort()).toEqual(STATUS.map(([k]) => k).sort());
  });
});

describe("código e progresso", () => {
  it("formata ENG-0001", () => {
    expect(formatarCodigo(1)).toBe("ENG-0001");
    expect(formatarCodigo(12345)).toBe("ENG-12345");
  });
  it("progresso cresce ao longo da jornada", () => {
    expect(progressoDoStatus("NOVA")).toBe(0);
    expect(progressoDoStatus("SIMIL_CONCLUIDO")).toBeGreaterThan(progressoDoStatus("EM_PREPARACAO"));
    expect(progressoDoStatus("ENTREGUE")).toBe(100);
  });
});
