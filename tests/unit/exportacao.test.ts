import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ operador: vi.fn(), demandas: vi.fn(), auditar: vi.fn() }));
vi.mock("@/lib/tenant", () => ({ exigirOperador: mocks.operador }));
vi.mock("@/lib/prisma", () => ({ prisma: { demanda: { findMany: mocks.demandas } } }));
vi.mock("@/lib/auditoria", () => ({ auditar: mocks.auditar }));
import { GET } from "@/app/api/relatorios/demandas/route";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.operador.mockResolvedValue({ empresa: { id: "empresa-a" }, email: "operador", papel: "GESTOR" });
  mocks.demandas.mockResolvedValue([]);
});

describe("exportação autenticada", () => {
  it("nega acesso sem permissão antes de consultar dados", async () => {
    mocks.operador.mockResolvedValue({ papel: "OPERADOR" });
    expect((await GET()).status).toBe(403);
    expect(mocks.demandas).not.toHaveBeenCalled();
  });
  it("restringe a consulta à empresa da sessão, audita e impede cache", async () => {
    const resposta = await GET();
    expect(resposta.status).toBe(200);
    expect(mocks.demandas).toHaveBeenCalledWith(expect.objectContaining({ where: { empresaId: "empresa-a" } }));
    expect(mocks.auditar).toHaveBeenCalledWith(expect.objectContaining({ empresaId: "empresa-a", acao: "demandas.exportadas" }));
    expect(resposta.headers.get("Cache-Control")).toBe("private, no-store");
    expect(await resposta.text()).toContain('"Código";"OS"');
  });
  it("não entrega arquivo silenciosamente truncado", async () => {
    mocks.demandas.mockResolvedValue(Array(10001).fill({}));
    expect((await GET()).status).toBe(422);
    expect(mocks.auditar).not.toHaveBeenCalled();
  });
});
