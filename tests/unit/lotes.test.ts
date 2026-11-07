import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ empresa: vi.fn(), demanda: vi.fn(), health: vi.fn(), validar: vi.fn(), pedir: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { empresa: { findUniqueOrThrow: mocks.empresa }, demanda: { findFirst: mocks.demanda } } }));
vi.mock("@/automation/adapters/simil", () => ({ healthcheckSimil: mocks.health }));
vi.mock("@/servicos/validacao", () => ({ revalidarDemanda: mocks.validar }));
vi.mock("@/servicos/automacoes", () => ({ pedirPreparacaoSimil: mocks.pedir }));
import { prepararLoteSimil, previaLoteSimil } from "@/servicos/lotes";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.empresa.mockResolvedValue({ modoAutomacao: "SOMBRA" });
  mocks.demanda.mockResolvedValue({ status: "PRONTA_PARA_PROCESSAMENTO" });
  mocks.validar.mockResolvedValue({ problemas: [] });
  mocks.pedir.mockResolvedValue({ novo: true });
});

describe("preparação em lote", () => {
  it("gera prévia sem criar jobs e informa pendências", async () => {
    mocks.validar.mockResolvedValueOnce({ problemas: [{ severidade: "BLOQUEIA", titulo: "Matrícula ausente" }] });
    const previa = await previaLoteSimil(["a", "b"], "empresa");
    expect(previa.map((r) => r.estado)).toEqual(["bloqueada", "pronta"]);
    expect(previa[0].mensagem).toContain("Matrícula ausente");
    expect(mocks.pedir).not.toHaveBeenCalled();
  });
  it("revalida na confirmação quando os dados mudaram após a prévia", async () => {
    expect((await previaLoteSimil(["a"], "empresa"))[0].estado).toBe("pronta");
    mocks.validar.mockResolvedValue({ problemas: [{ severidade: "BLOQUEIA", titulo: "Documento removido" }] });
    expect((await prepararLoteSimil(["a"], "empresa", "operador"))[0].estado).toBe("bloqueada");
    expect(mocks.pedir).not.toHaveBeenCalled();
  });
  it("bloqueia modo real sem conexão antes de tocar nas demandas", async () => {
    mocks.empresa.mockResolvedValue({ modoAutomacao: "REAL" });
    mocks.health.mockResolvedValue({ ok: false });
    await expect(prepararLoteSimil(["a"], "empresa", "operador")).rejects.toThrow("conexão real");
    expect(mocks.demanda).not.toHaveBeenCalled();
    expect(mocks.pedir).not.toHaveBeenCalled();
  });
  it("não valida nem enfileira demanda fora da empresa", async () => {
    mocks.demanda.mockResolvedValue(null);
    const resultado = await prepararLoteSimil(["outra"], "empresa", "operador");
    expect(mocks.demanda).toHaveBeenCalledWith({ where: { id: "outra", empresaId: "empresa" }, select: { status: true } });
    expect(resultado[0].estado).toBe("bloqueada");
    expect(mocks.validar).not.toHaveBeenCalled();
    expect(mocks.pedir).not.toHaveBeenCalled();
  });
  it("continua após bloqueios e falhas sem repetir IDs", async () => {
    mocks.validar.mockResolvedValueOnce({ problemas: [{ severidade: "BLOQUEIA", titulo: "Documento ausente" }] }).mockRejectedValueOnce(new Error("falha interna"));
    const resultado = await prepararLoteSimil(["a", "b", "c", "c"], "empresa", "operador");
    expect(resultado.map((r) => r.estado)).toEqual(["bloqueada", "bloqueada", "enfileirada"]);
    expect(mocks.pedir).toHaveBeenCalledExactlyOnceWith("c", "empresa", "operador");
  });
  it("recusa lote vazio ou excessivo", async () => {
    await expect(prepararLoteSimil([], "empresa", "operador")).rejects.toThrow("1 a 50");
    await expect(prepararLoteSimil(Array.from({ length: 51 }, (_, i) => String(i)), "empresa", "operador")).rejects.toThrow("1 a 50");
    expect(mocks.empresa).not.toHaveBeenCalled();
  });
  it("informa preparação já existente", async () => {
    mocks.pedir.mockResolvedValue({ novo: false });
    expect((await prepararLoteSimil(["a"], "empresa", "operador"))[0].estado).toBe("existente");
  });
});
