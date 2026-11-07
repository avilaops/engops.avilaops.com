import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Prisma } from "@prisma/client";

const mocks = vi.hoisted(() => ({ membros: vi.fn(), criar: vi.fn(), listar: vi.fn(), contar: vi.fn(), atualizar: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { notificacao: { findMany: mocks.listar, count: mocks.contar, updateMany: mocks.atualizar } } }));
import { listarNotificacoes, marcarNotificacaoLida, notificarEvento } from "@/servicos/notificacoes";
const tx = { membro: { findMany: mocks.membros }, notificacao: { createMany: mocks.criar } } as unknown as Prisma.TransactionClient;

beforeEach(() => {
  vi.resetAllMocks();
  mocks.listar.mockResolvedValue([]);
  mocks.contar.mockResolvedValue(0);
  mocks.membros.mockResolvedValue([
    { email: "ADMIN@exemplo.test", papel: "ADMIN" },
    { email: "admin@exemplo.test", papel: "ADMIN" },
    { email: "operador@exemplo.test", papel: "OPERADOR" },
    { email: "revisor@exemplo.test", papel: "REVISOR" },
    { email: "consulta@exemplo.test", papel: "CONSULTA" },
  ]);
});

describe("notificações", () => {
  it("envia aprovação só a membros ativos autorizados, sem duplicar email", async () => {
    await notificarEvento(tx, "empresa-a", "AprovacaoSolicitada", {});
    expect(mocks.membros).toHaveBeenCalledWith(expect.objectContaining({ where: { empresaId: "empresa-a", ativo: true } }));
    expect(mocks.criar.mock.calls[0][0].data.map((n: { destinatario: string }) => n.destinatario)).toEqual(["admin@exemplo.test", "revisor@exemplo.test"]);
  });
  it("envia falhas a executores sem expor mensagem técnica do payload", async () => {
    await notificarEvento(tx, "empresa-a", "AutomacaoFalhou", { jobId: "job-1", mensagem: "segredo" });
    const avisos = mocks.criar.mock.calls[0][0].data;
    expect(avisos.map((n: { destinatario: string }) => n.destinatario)).toEqual(["admin@exemplo.test", "operador@exemplo.test"]);
    expect(avisos[0].link).toBe("/automacoes/job-1");
    expect(JSON.stringify(avisos)).not.toContain("segredo");
  });
  it("não notifica eventos fora da política ou empresas sem destinatários", async () => {
    await notificarEvento(tx, "empresa-a", "DocumentoEnviado", {});
    expect(mocks.membros).not.toHaveBeenCalled();
    mocks.membros.mockResolvedValue([]);
    await notificarEvento(tx, "empresa-a", "AutomacaoFalhou", {});
    expect(mocks.criar).not.toHaveBeenCalled();
  });
  it("lista e conta apenas os avisos do destinatário na empresa", async () => {
    await listarNotificacoes("empresa-a", "USER@exemplo.test", 2, true);
    expect(mocks.listar).toHaveBeenCalledWith(expect.objectContaining({ where: { empresaId: "empresa-a", destinatario: "user@exemplo.test", lidaEm: null }, skip: 30, take: 30 }));
    for (const [args] of mocks.contar.mock.calls) expect(args.where).toMatchObject({ empresaId: "empresa-a", destinatario: "user@exemplo.test" });
  });
  it("marca leitura apenas do dono, da empresa e ainda não lida", async () => {
    await marcarNotificacaoLida("empresa-a", "USER@exemplo.test", "aviso-1");
    expect(mocks.atualizar).toHaveBeenCalledWith({ where: { id: "aviso-1", empresaId: "empresa-a", destinatario: "user@exemplo.test", lidaEm: null }, data: { lidaEm: expect.any(Date) } });
  });
});
