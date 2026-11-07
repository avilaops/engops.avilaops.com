import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ membro: vi.fn(), recente: vi.fn(), lock: vi.fn(), auditar: vi.fn(), fetch: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: (fn: (tx: unknown) => unknown) => fn({ $queryRaw: mocks.lock, membro: { findFirst: mocks.membro }, auditoria: { findFirst: mocks.recente } }) } }));
vi.mock("@/lib/auditoria", () => ({ auditar: mocks.auditar }));
import { enviarConvite } from "@/servicos/convites";

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("ENGOPS_CONVITE_WEBHOOK_URL", "https://mail.example.test/webhook");
  vi.stubEnv("ENGOPS_CONVITE_WEBHOOK_TOKEN", "test-token");
  vi.stubEnv("APP_BASE_URL", "https://engops.example.test");
  vi.stubGlobal("fetch", mocks.fetch);
  mocks.membro.mockResolvedValue({ email: "pessoa@example.test", nome: "Pessoa", papel: "OPERADOR", empresa: { nome: "Empresa" } });
  mocks.recente.mockResolvedValue(null);
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("convites por n8n", () => {
  it("exige configuração antes de acessar ou enviar", async () => {
    vi.stubEnv("ENGOPS_CONVITE_WEBHOOK_TOKEN", "");
    await expect(enviarConvite("empresa", "admin", "membro")).rejects.toThrow("configurado");
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("restringe a busca à empresa e a membros ativos", async () => {
    mocks.membro.mockResolvedValue(null);
    await expect(enviarConvite("empresa", "admin", "membro")).rejects.toThrow("não encontrado");
    expect(mocks.membro).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "membro", empresaId: "empresa", ativo: true } }));
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it("bloqueia reenvio recente", async () => {
    mocks.recente.mockResolvedValue({ id: "tentativa" });
    await expect(enviarConvite("empresa", "admin", "membro")).rejects.toThrow("cinco minutos");
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it.each([{ ok: false }, { ok: true }])("não trata HTTP 200 como envio confirmado: %j", async (body) => {
    mocks.fetch.mockResolvedValue({ ok: true, json: async () => body });
    expect(await enviarConvite("empresa", "admin", "membro")).toHaveProperty("erro");
    expect(mocks.auditar).toHaveBeenCalledWith(expect.objectContaining({ acao: "membro.convite.nao-confirmado" }), expect.anything());
  });
  it("aceita confirmação com messageId e usa email do cadastro", async () => {
    mocks.fetch.mockResolvedValue({ ok: true, json: async () => ({ ok: true, messageId: "id-smtp" }) });
    expect(await enviarConvite("empresa", "admin", "membro")).toHaveProperty("ok");
    const pedido = JSON.parse(mocks.fetch.mock.calls[0][1].body);
    expect(pedido.para).toBe("pessoa@example.test");
    expect(pedido.texto).toContain("https://engops.example.test/demandas");
    expect(mocks.auditar).toHaveBeenCalledWith(expect.objectContaining({ acao: "membro.convite.enviado", metadados: { messageId: "id-smtp" } }), expect.anything());
  });
});
