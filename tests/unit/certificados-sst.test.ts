import { describe, expect, it, vi } from "vitest";
import { executarComRetryConcorrente, proximaVersaoCertificado } from "@/servicos/certificados-sst";

describe("certificados SST", () => {
  it("inicia na versão 1 e incrementa a emissão existente", () => {
    expect(proximaVersaoCertificado(null)).toBe(1);
    expect(proximaVersaoCertificado({ versao: 4 })).toBe(5);
  });

  it("repete conflito serializável e devolve o resultado", async () => {
    const operacao = vi.fn()
      .mockRejectedValueOnce(Object.assign(new Error("write conflict"), { code: "P2034" }))
      .mockResolvedValue("ok");
    await expect(executarComRetryConcorrente(operacao)).resolves.toBe("ok");
    expect(operacao).toHaveBeenCalledTimes(2);
  });

  it("não repete falhas que não sejam de concorrência", async () => {
    const operacao = vi.fn().mockRejectedValue(new Error("regra de negócio"));
    await expect(executarComRetryConcorrente(operacao)).rejects.toThrow("regra de negócio");
    expect(operacao).toHaveBeenCalledTimes(1);
  });
});
