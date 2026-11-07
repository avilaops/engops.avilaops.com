import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { consultarCnpj } from "@/servicos/cnpjws";
const requisitar = vi.fn();
beforeEach(() => { vi.resetAllMocks(); vi.stubGlobal("fetch", requisitar); });
afterEach(() => vi.unstubAllGlobals());
const cnpj = "11222333000181";
describe("consulta CNPJ.ws", () => {
  it.each(["52998224725", "11111111111111", "abc"])("recusa CPF ou documento inválido sem consultar: %s", async (documento) => {
    await expect(consultarCnpj(documento)).rejects.toThrow("CNPJ válido");
    expect(requisitar).not.toHaveBeenCalled();
  });
  it.each([[429, "Limite"], [404, "não encontrado"], [500, "indisponível"]])("trata status %s", async (status, mensagem) => {
    requisitar.mockResolvedValue({ ok: false, status });
    await expect(consultarCnpj(cnpj)).rejects.toThrow(String(mensagem));
  });
  it("recusa retorno de outra empresa", async () => {
    requisitar.mockResolvedValue({ ok: true, json: async () => ({ razao_social: "Teste", estabelecimento: { cnpj: "00000000000191" } }) });
    await expect(consultarCnpj(cnpj)).rejects.toThrow("outro CNPJ");
  });
  it("normaliza documento e preserva campos adicionais no retorno", async () => {
    const dados = { razao_social: "Empresa de teste", socios: [{ nome: "Sócio de teste" }], estabelecimento: { cnpj, email: null, inscricoes_estaduais: [{ inscricao_estadual: "123" }] } };
    requisitar.mockResolvedValue({ ok: true, json: async () => dados });
    expect(await consultarCnpj("11.222.333/0001-81")).toEqual(dados);
    expect(requisitar).toHaveBeenCalledWith(`https://publica.cnpj.ws/cnpj/${cnpj}`, expect.objectContaining({ next: { revalidate: 86400 } }));
  });
  it("trata timeout e JSON inválido sem expor detalhes técnicos", async () => {
    requisitar.mockRejectedValueOnce(new Error("internal"));
    await expect(consultarCnpj(cnpj)).rejects.toThrow("Não foi possível");
    requisitar.mockResolvedValue({ ok: true, json: async () => { throw new Error("JSON"); } });
    await expect(consultarCnpj(cnpj)).rejects.toThrow("dados inválidos");
  });
});
