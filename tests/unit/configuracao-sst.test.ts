import { describe, expect, it } from "vitest";
import { configuracaoSstSchema } from "@/dominio/configuracao-sst";

describe("configuração SST por tenant", () => {
  it("normaliza identidade e responsável técnico", () => {
    const dados = configuracaoSstSchema.parse({ nomeExibicao: " GRB ", responsavelNome: " Guilherme ", responsavelRegistro: " CREA 123 ", logoPrincipalUrl: "", logoSimboloUrl: "/simbolo.png", logoClienteUrl: "" });
    expect(dados).toMatchObject({ nomeExibicao: "GRB", responsavelNome: "Guilherme", logoPrincipalUrl: null, logoClienteUrl: null });
    expect(configuracaoSstSchema.parse(dados)).toEqual(dados);
  });

  it("rejeita URL externa insegura", () => {
    expect(() => configuracaoSstSchema.parse({ nomeExibicao: "GRB", responsavelNome: "Guilherme", responsavelRegistro: "CREA 123", logoPrincipalUrl: "https://example.test/logo.png", logoSimboloUrl: "", logoClienteUrl: "" })).toThrow();
    expect(() => configuracaoSstSchema.parse({ nomeExibicao: "GRB", responsavelNome: "Guilherme", responsavelRegistro: "CREA 123", logoPrincipalUrl: "//example.test/logo.png", logoSimboloUrl: "", logoClienteUrl: "" })).toThrow();
    expect(() => configuracaoSstSchema.parse({ nomeExibicao: "GRB", responsavelNome: "Guilherme", responsavelRegistro: "CREA 123", logoPrincipalUrl: "/\\example.test/logo.png", logoSimboloUrl: "", logoClienteUrl: "" })).toThrow();
  });
});
