import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Operador } from "@/lib/tenant";
const mocks = vi.hoisted(() => ({
  db: {
    $transaction: vi.fn(), siopCredencial: { findUnique: vi.fn(), upsert: vi.fn() },
    siopConsulta: { create: vi.fn(), update: vi.fn(), findMany: vi.fn(), findFirst: vi.fn(), count: vi.fn() },
    siopRetorno: { create: vi.fn() }, siopExecucaoOrcamentariaPac: { createMany: vi.fn(), findMany: vi.fn(), count: vi.fn() },
  }, remoto: vi.fn(), auditoria: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({ prisma: mocks.db }));
vi.mock("@/lib/auditoria", () => ({ auditar: mocks.auditoria }));
vi.mock("@/integracoes/siop/soap", async (original) => ({ ...await original<typeof import("@/integracoes/siop/soap")>(), consultarPacRemoto: mocks.remoto }));
import { configurarSiop, executarConsultaSiop, listarConsultasSiop, obterRetornoSiop } from "@/servicos/siop";

const segredo = "0123456789abcdef0123456789abcdef";
const op = { empresa: { id: "empresa-a" }, email: "teste@example.org", papel: "ADMIN" } as Operador;
beforeEach(() => {
  vi.resetAllMocks();
  process.env.SIOP_TESTE_MD5 = segredo;
  mocks.db.$transaction.mockImplementation(async (fn) => fn(mocks.db));
  mocks.db.siopCredencial.findUnique.mockResolvedValue({ id: "credencial-a", usuario: "integracao", perfil: 32, email: null, senhaEnvRef: "SIOP_TESTE_MD5", habilitada: true });
  mocks.db.siopConsulta.create.mockResolvedValue({ id: "consulta-a" });
  mocks.db.siopRetorno.create.mockResolvedValue({ id: "retorno-a" });
  mocks.remoto.mockResolvedValue({ sucesso: true, execucoesOrcamentarias: { execucaoOrcamentaria: [] } });
});

describe("SIOP • serviço autenticado e isolado por empresa", () => {
  it("recusa consulta para quem só pode ler, antes de acessar banco ou portal", async () => {
    await expect(executarConsultaSiop({ ...op, papel: "CONSULTA" }, { anoExercicio: 2026 })).rejects.toMatchObject({ codigo: "PROIBIDO" });
    expect(mocks.db.siopCredencial.findUnique).not.toHaveBeenCalled();
    expect(mocks.remoto).not.toHaveBeenCalled();
  });
  it("recusa configurar por gestor e habilitar sem segredo disponível", async () => {
    const entrada = { usuario: "integracao", perfil: 32, senhaEnvRef: "SIOP_AUSENTE_MD5", habilitada: true };
    await expect(configurarSiop({ ...op, papel: "GESTOR" }, entrada)).rejects.toMatchObject({ codigo: "PROIBIDO" });
    await expect(configurarSiop(op, entrada)).rejects.toMatchObject({ codigo: "CREDENCIAL_AUSENTE" });
    expect(mocks.db.siopCredencial.upsert).not.toHaveBeenCalled();
  });
  it("mantém conexão sem credencial desativada, sem fabricar uma consulta", async () => {
    mocks.db.siopCredencial.findUnique.mockResolvedValue({ habilitada: false });
    await expect(executarConsultaSiop(op, { anoExercicio: 2026 })).rejects.toMatchObject({ codigo: "NAO_CONFIGURADO" });
    expect(mocks.remoto).not.toHaveBeenCalled();
    expect(mocks.db.siopConsulta.create).not.toHaveBeenCalled();
  });
  it("busca a configuração da empresa atual e grava todos os registros por lotes atômicos", async () => {
    mocks.remoto.mockResolvedValue({ sucesso: true, execucoesOrcamentarias: { execucaoOrcamentaria: Array.from({ length: 501 }, () => ({ localizador: "0032", pago: "0.10" })) } });
    expect(await executarConsultaSiop(op, { exercicio: 2026 })).toEqual({ id: "consulta-a", sucesso: true, quantidade: 501 });
    expect(mocks.db.siopCredencial.findUnique).toHaveBeenCalledWith({ where: { empresaId_ambiente: { empresaId: "empresa-a", ambiente: "HOMOLOGACAO" } } });
    const gravados = mocks.db.siopExecucaoOrcamentariaPac.createMany.mock.calls.flatMap(([args]) => args.data);
    expect(gravados).toHaveLength(501);
    expect(gravados[500]).toEqual({ empresaId: "empresa-a", retornoId: "retorno-a", ordem: 500, localizador: "0032", pago: "0.10" });
    expect(mocks.db.siopConsulta.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id_empresaId: { id: "consulta-a", empresaId: "empresa-a" } } }));
    expect(JSON.stringify(mocks.auditoria.mock.calls)).not.toContain(segredo);
  });
  it("preserva mensagens nulas e retira segredo eventualmente ecoado pelo serviço", async () => {
    mocks.remoto.mockResolvedValue({ sucesso: false, mensagensErro: [null, `Credencial ${segredo} recusada`] });
    const resultado = await executarConsultaSiop(op, { anoExercicio: 2026 });
    expect(resultado.mensagensErro).toEqual([null, "Credencial [redigido] recusada"]);
    expect(JSON.stringify(mocks.db.siopRetorno.create.mock.calls)).not.toContain(segredo);
    expect(mocks.db.siopConsulta.update.mock.calls[0][0].data.status).toBe("RECUSADA");
  });
  it("grava falha local sem detalhes do erro externo e sem sucesso fictício", async () => {
    mocks.remoto.mockRejectedValue(new Error(`XML senha=${segredo}`));
    await expect(executarConsultaSiop(op, { anoExercicio: 2026 })).rejects.toThrow("não foi concluída");
    expect(mocks.db.siopConsulta.update.mock.calls[0][0].data.status).toBe("FALHOU");
    expect(mocks.db.siopRetorno.create).not.toHaveBeenCalled();
    expect(JSON.stringify(mocks.auditoria.mock.calls)).not.toContain(segredo);
  });
  it("não revela consulta de outra empresa e pagina apenas os registros autorizados", async () => {
    mocks.db.siopConsulta.findFirst.mockResolvedValue(null);
    await expect(obterRetornoSiop(op, "consulta-outra")).rejects.toMatchObject({ codigo: "NAO_ENCONTRADO" });
    expect(mocks.db.siopExecucaoOrcamentariaPac.findMany).not.toHaveBeenCalled();
    await listarConsultasSiop(op, "HOMOLOGACAO", 2);
    expect(mocks.db.siopConsulta.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { empresaId: "empresa-a", ambiente: "HOMOLOGACAO" }, take: 50, skip: 50 }));
  });
});
