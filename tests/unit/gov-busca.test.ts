import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

const mocks = vi.hoisted(() => ({ query: vi.fn(), execute: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: {
  $queryRaw: mocks.query,
  $transaction: async (fn: (tx: unknown) => unknown) => fn({ $queryRaw: mocks.query, $executeRaw: mocks.execute }),
} }));
import { analisarGlobalGov } from "@/servicos/gov-busca";

beforeEach(() => vi.clearAllMocks());
describe("consulta global GOV em volume", () => {
  it("consolida totais e cinco dimensões em uma consulta com os filtros da busca", async () => {
    mocks.query.mockResolvedValue([
      { dimensao: "orgaos", grupo: "Órgão A", quantidade: 2n, valor: new Prisma.Decimal(100) },
      { dimensao: "regioes", grupo: "Sudeste", quantidade: 2n, valor: new Prisma.Decimal(100) },
    ]);
    const r = await analisarGlobalGov({ uf: "SP" });
    expect(mocks.query).toHaveBeenCalledTimes(1);
    expect(mocks.execute.mock.calls[0][0].sql).toContain("SET LOCAL work_mem");
    expect(mocks.query.mock.calls[0][0].values).toContain("SP");
    expect(r.grupos.orgaos).toEqual([{ grupo: "Órgão A", quantidade: 2n, valor: new Prisma.Decimal(100) }]);
    expect(r.grupos.regioes[0].grupo).toBe("Sudeste");
    expect(r.grupos.categorias).toEqual([]);
    expect(r.grupos.modalidades).toEqual([]);
    expect(r.grupos.periodos).toEqual([]);
  });
  it("calcula o total do mesmo retrato e mantém os valores de planejamento separados", async () => {
    mocks.query.mockResolvedValue([
      { dimensao: "totais", grupo: "CONTRATACAO", quantidade: 2n, comValor: 1n, valor: new Prisma.Decimal(100) },
      { dimensao: "totais", grupo: "PLANEJAMENTO", quantidade: 1n, comValor: 1n, valor: new Prisma.Decimal(9999) },
    ]);
    const r = await analisarGlobalGov({});
    expect(mocks.query).toHaveBeenCalledTimes(1);
    expect(r.total).toBe(3);
    expect(r.totais[0].valor?.toString()).toBe("100");
    expect(r.totais[1].valor?.toString()).toBe("9999");
  });
});
