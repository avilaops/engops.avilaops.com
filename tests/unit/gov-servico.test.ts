import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Operador } from "@/lib/tenant";
const mocks = vi.hoisted(() => ({ registro: { findUnique: vi.fn() }, salva: { upsert: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), updateMany: vi.fn() }, auditar: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { oportunidadeGovSalva: mocks.salva, govRegistro: mocks.registro } }));
vi.mock("@/lib/auditoria", () => ({ auditar: mocks.auditar }));
import { listarSalvasGov, salvarOportunidadeGov, atualizarSalvaGov } from "@/servicos/gov";
const op = { empresa: { id: "empresa-a" }, email: "teste@example.org", papel: "ADMIN" } as Operador;
beforeEach(() => { vi.clearAllMocks(); mocks.salva.upsert.mockResolvedValue({ id: "salva-a" }); });
describe("Central GOV • isolamento de salvos", () => {
  it("lista somente a empresa da sessão", async () => {
    await listarSalvasGov(op);
    expect(mocks.salva.findMany.mock.calls[0][0].where).toEqual({ empresaId: "empresa-a" });
  });
  it("recusa gravações de consulta e revisor antes do banco", async () => {
    for (const papel of ["CONSULTA", "REVISOR"] as const) await expect(salvarOportunidadeGov({ ...op, papel }, {})).rejects.toThrow(/permissão/);
    expect(mocks.salva.upsert).not.toHaveBeenCalled();
  });
  it("atualiza notas somente na empresa atual e acusa ID alheio", async () => {
    mocks.salva.updateMany.mockResolvedValue({ count: 0 });
    await expect(atualizarSalvaGov(op, "alheio", "análise", "EM_ANALISE")).rejects.toThrow(/encontrada/);
    expect(mocks.salva.updateMany.mock.calls[0][0].where).toEqual({ id: "alheio", empresaId: "empresa-a" });
  });
  it("salva de forma idempotente e rejeita links não oficiais", async () => {
    const dados = { id: "externo", fonte: "PNCP", tipo: "CONTRATACAO", objeto: "Pintura", orgao: "Órgão", cnpj: null, uf: null, municipio: null, modalidade: null, situacao: null, valor: null, publicado: null, prazo: null, atualizado: null, ano: 2026, url: "https://pncp.gov.br/app/editais/12345678000190/2026/1" };
    await salvarOportunidadeGov(op, dados);
    const chamada = mocks.salva.upsert.mock.calls[0][0];
    expect(chamada.where.empresaId_fonte_externoId).toEqual({ empresaId: "empresa-a", fonte: "PNCP", externoId: "externo" });
    expect(chamada.update).not.toHaveProperty("notas");
    await expect(salvarOportunidadeGov(op, { ...dados, url: "https://evil.example" })).rejects.toThrow();
  });
});
