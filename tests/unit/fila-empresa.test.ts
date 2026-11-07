import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

const mocks = vi.hoisted(() => ({ query: vi.fn(), buscar: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { $queryRaw: mocks.query, job: { findUnique: mocks.buscar } } }));
import { reclamar, umCiclo } from "@/automation/core/fila";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.query.mockResolvedValue([]);
});

function consulta() {
  const [strings, ...valores] = mocks.query.mock.calls[0];
  return Prisma.sql(strings, ...valores);
}

describe("escopo da fila", () => {
  it("inclui filtro parametrizado da empresa na seleção e mantém o lock", async () => {
    await reclamar("manual", "empresa-a");
    const sql = consulta();
    expect(sql.sql).toContain('AND "empresaId" = ?');
    expect(sql.values).toContain("empresa-a");
    expect(sql.sql).not.toContain("empresa-a");
    expect(sql.sql).toContain("FOR UPDATE SKIP LOCKED");
  });
  it("propaga empresa no ciclo manual e não processa quando a fila está vazia", async () => {
    expect(await umCiclo("manual", "empresa-b")).toBe(false);
    expect(consulta().values).toContain("empresa-b");
    expect(mocks.buscar).not.toHaveBeenCalled();
  });
  it("mantém a fila global para o worker de serviço", async () => {
    await reclamar("worker");
    expect(consulta().sql).not.toContain('AND "empresaId"');
  });
  it("rejeita empresa vazia em vez de ampliar o escopo", async () => {
    await expect(reclamar("manual", " ")).rejects.toThrow("Empresa inválida");
    expect(mocks.query).not.toHaveBeenCalled();
  });
});
