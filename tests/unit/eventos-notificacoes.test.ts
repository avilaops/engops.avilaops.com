import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Prisma } from "@prisma/client";
const mocks = vi.hoisted(() => ({ transacao: vi.fn(), evento: vi.fn(), notificar: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: mocks.transacao } }));
vi.mock("@/servicos/notificacoes", () => ({ notificarEvento: mocks.notificar }));
import { emitirEvento } from "@/lib/auditoria";
const tx = { eventoDominio: { create: mocks.evento } } as unknown as Prisma.TransactionClient;

beforeEach(() => {
  vi.resetAllMocks();
  mocks.transacao.mockImplementation((fn) => fn(tx));
});
describe("evento e notificação", () => {
  it("usa a mesma transação para o evento e seus avisos", async () => {
    await emitirEvento("empresa", "AutomacaoFalhou", { jobId: "job" });
    expect(mocks.transacao).toHaveBeenCalledOnce();
    expect(mocks.evento).toHaveBeenCalledWith({ data: { empresaId: "empresa", nome: "AutomacaoFalhou", payload: { jobId: "job" } } });
    expect(mocks.notificar).toHaveBeenCalledWith(tx, "empresa", "AutomacaoFalhou", { jobId: "job" });
  });
  it("reaproveita a transação do chamador sem abrir outra", async () => {
    await emitirEvento("empresa", "AprovacaoSolicitada", {}, tx);
    expect(mocks.transacao).not.toHaveBeenCalled();
    expect(mocks.notificar).toHaveBeenCalledWith(tx, "empresa", "AprovacaoSolicitada", {});
  });
  it("propaga falha de notificação para abortar a transação", async () => {
    mocks.notificar.mockRejectedValue(new Error("falha ao persistir"));
    await expect(emitirEvento("empresa", "AutomacaoFalhou", {})).rejects.toThrow("falha ao persistir");
  });
});
