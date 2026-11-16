import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Operador } from "@/lib/tenant";
const mocks = vi.hoisted(() => ({
  tx: { $queryRaw: vi.fn(), govColeta: { findUnique: vi.fn(), update: vi.fn() } },
  transacao: vi.fn(), auditar: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: mocks.transacao } }));
vi.mock("@/lib/auditoria", () => ({ auditar: mocks.auditar }));
import { controlarColetaGov } from "@/servicos/gov-coletas";
import { estadoColetaGov } from "@/dominio/gov-catalogo";

const op = { dono: true, papel: "ADMIN", empresa: { id: "empresa-a" }, email: "dono@example.test" } as Operador;
beforeEach(() => {
  vi.resetAllMocks();
  mocks.transacao.mockImplementation(async (fn) => fn(mocks.tx));
  mocks.tx.$queryRaw.mockResolvedValue([{ id: "pncp-historico" }]);
  mocks.tx.govColeta.findUnique.mockResolvedValue({ id: "pncp-historico", habilitada: true, proximaEm: new Date(0) });
});

describe("controle das coletas globais GOV", () => {
  it.each(["ADMIN", "GESTOR", "OPERADOR", "REVISOR", "CONSULTA"] as const)("não permite que membro %s controle coleta compartilhada", async papel => {
    await expect(controlarColetaGov({ ...op, dono: false, papel }, "pncp-historico", "pausar")).rejects.toThrow(/dono da plataforma/);
    expect(mocks.transacao).not.toHaveBeenCalled();
  });
  it("valida operação e identificação antes de tocar no banco", async () => {
    await expect(controlarColetaGov(op, "pncp-historico", "apagar")).rejects.toThrow(/inválid/);
    await expect(controlarColetaGov(op, "", "pausar")).rejects.toThrow(/inválid/);
    expect(mocks.transacao).not.toHaveBeenCalled();
  });
  it("pausa sem mudar cursor, checkpoint ou reserva e audita na mesma transação", async () => {
    expect(await controlarColetaGov(op, "pncp-historico", "pausar")).toEqual({ alterou: true, habilitada: false });
    expect(mocks.tx.govColeta.update).toHaveBeenCalledWith({ where: { id: "pncp-historico" }, data: { habilitada: false } });
    expect(mocks.auditar).toHaveBeenCalledWith(expect.objectContaining({
      empresaId: op.empresa.id, usuario: op.email, acao: "gov.coleta.pausar", objetoId: "pncp-historico",
      metadados: { escopo: "catalogo-global" },
    }), mocks.tx);
  });
  it("retoma imediatamente sem apagar o último erro ou as tentativas", async () => {
    mocks.tx.govColeta.findUnique.mockResolvedValue({ id: "pncp-historico", habilitada: false, proximaEm: new Date(0) });
    expect(await controlarColetaGov(op, "pncp-historico", "retomar")).toEqual({ alterou: true, habilitada: true });
    expect(mocks.tx.govColeta.update).toHaveBeenCalledWith({ where: { id: "pncp-historico" }, data: { habilitada: true, proximaEm: expect.any(Date) } });
  });
  it("repetir a mesma operação não duplica auditoria nem modifica o agendamento", async () => {
    expect(await controlarColetaGov(op, "pncp-historico", "retomar")).toEqual({ alterou: false, habilitada: true });
    expect(mocks.tx.govColeta.update).not.toHaveBeenCalled();
    expect(mocks.auditar).not.toHaveBeenCalled();
  });
  it("recusa coleta inexistente", async () => {
    mocks.tx.$queryRaw.mockResolvedValue([]);
    await expect(controlarColetaGov(op, "inexistente", "pausar")).rejects.toThrow(/não encontrada/);
    expect(mocks.tx.govColeta.update).not.toHaveBeenCalled();
  });
});

it("distingue pausa solicitada de pausa efetiva e falha de página em execução", () => {
  const agora = new Date("2026-11-16T12:00:00Z");
  const entrada = { habilitada: false, reservaAte: new Date("2026-11-16T12:05:00Z"), ultimoErro: null };
  expect(estadoColetaGov(entrada, agora)).toBe("Pausando após a página em andamento");
  expect(estadoColetaGov({ ...entrada, reservaAte: null }, agora)).toBe("Pausada");
  expect(estadoColetaGov({ ...entrada, habilitada: true }, agora)).toBe("Processando página");
  expect(estadoColetaGov({ ...entrada, habilitada: true, reservaAte: null, ultimoErro: "HTTP 503" }, agora)).toBe("Aguardando nova tentativa");
  expect(estadoColetaGov({ ...entrada, habilitada: true, reservaAte: null }, agora)).toBe("Ativa");
});
