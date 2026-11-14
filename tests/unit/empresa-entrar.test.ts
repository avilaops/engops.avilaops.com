import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ membro: vi.fn(), atualizar: vi.fn(), empresa: vi.fn(), sessao: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { membro: { findFirst: mocks.membro, update: mocks.atualizar }, empresa: { findFirst: mocks.empresa } } }));
vi.mock("@/lib/tenant", async (original) => ({
  ...await original<typeof import("@/lib/tenant")>(),
  exigirSessao: mocks.sessao,
}));
import { GET } from "@/app/api/empresa/[id]/entrar/route";

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("ENGOPS_SITE_URL", "https://engops.avilaops.com");
  vi.stubEnv("NODE_ENV", "production");
  mocks.sessao.mockResolvedValue({ email: "operador@example.test" });
  mocks.membro.mockResolvedValue({
    id: "membro-a", empresaId: "empresa-a", email: "operador@example.test", nome: "Operador",
    papel: "OPERADOR", ativo: true, criadoEm: new Date("2026-01-01"), ultimoAcessoEm: null,
  });
});

afterEach(() => vi.unstubAllEnvs());

function entrar(voltar?: string) {
  const url = new URL("http://0.0.0.0:3130/api/empresa/empresa-a/entrar");
  if (voltar !== undefined) url.searchParams.set("voltar", voltar);
  return GET(new NextRequest(url), { params: Promise.resolve({ id: "empresa-a" }) });
}

describe("entrada na empresa atrás do proxy", () => {
  it("redireciona para o domínio público e mantém o cookie da empresa", async () => {
    const resposta = await entrar();
    expect(resposta.status).toBe(303);
    expect(resposta.headers.get("location")).toBe("https://engops.avilaops.com/demandas");
    expect(resposta.cookies.get("engops_empresa")).toMatchObject({
      value: "empresa-a", httpOnly: true, sameSite: "lax", secure: true, path: "/", maxAge: 2592000,
    });
  });

  it("preserva o caminho e a consulta de retorno no domínio público", async () => {
    const resposta = await entrar("/demandas?status=NOVA&pagina=2");
    expect(resposta.headers.get("location")).toBe("https://engops.avilaops.com/demandas?status=NOVA&pagina=2");
  });

  it("respeita a URL configurada para outro ambiente", async () => {
    vi.stubEnv("ENGOPS_SITE_URL", "http://localhost:4130");
    const resposta = await entrar("/empresas");
    expect(resposta.headers.get("location")).toBe("http://localhost:4130/empresas");
  });

  it.each([
    "https://externo.example/demandas", "demandas", "//externo.example/demandas",
    "/\\externo.example/demandas", "/\n/externo.example/demandas", "//[invalido",
  ])("usa o destino padrão para retorno externo ou inválido: %j", async (voltar) => {
    const resposta = await entrar(voltar);
    expect(resposta.headers.get("location")).toBe("https://engops.avilaops.com/demandas");
  });

  it("nega empresa sem acesso e não grava o cookie", async () => {
    mocks.membro.mockResolvedValue(null);
    const resposta = await entrar();
    expect(resposta.status).toBe(303);
    expect(resposta.headers.get("location")).toBe("https://engops.avilaops.com/empresas?erro=sem-acesso");
    expect(resposta.cookies.get("engops_empresa")).toBeUndefined();
    expect(mocks.atualizar).not.toHaveBeenCalled();
  });
});
