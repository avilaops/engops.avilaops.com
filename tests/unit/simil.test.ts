import { describe, expect, it } from "vitest";
import { executarSimil, prepararCamposSimil, resumoDosCampos, type FonteSimil } from "@/automation/adapters/simil";
import { ErroAutomacao, explicarErro } from "@/automation/core/erros";

const fonte = (): FonteSimil => ({
  codigo: "ENG-0001",
  numeroOs: "18453",
  tipoServico: "Avaliação de imóvel",
  endereco: "Rua das Flores",
  numero: "10",
  complemento: null,
  bairro: "Centro",
  municipio: "Curitiba",
  uf: "PR",
  cep: "80000-000",
  matricula: "12345",
  cartorio: null,
  areaM2: 184.32,
  tipoImovel: "Casa",
  proprietarioNome: "João da Silva",
  proprietarioDoc: "52998224725",
  valorAvaliacao: 350000,
  dataVistoria: new Date(2026, 8, 10),
  responsavelNome: "Maria",
  camposEmRevisao: [],
});

describe("adapter SIMIL", () => {
  it("com fonte completa todos os campos ficam validados", () => {
    const campos = prepararCamposSimil(fonte());
    const r = resumoDosCampos(campos);
    expect(r.ausentes).toBe(0);
    expect(r.revisar).toBe(0);
    expect(r.validados).toBe(r.total);
    expect(campos.find((c) => c.campo === "area_m2")?.valor).toBe("184,32");
    expect(campos.find((c) => c.campo === "proprietario_documento")?.valor).toBe("529.982.247-25");
    expect(campos.find((c) => c.campo === "endereco")?.valor).toBe("Rua das Flores, 10");
  });
  it("obrigatório vazio fica ausente; opcional vazio continua validado", () => {
    const f = fonte();
    f.matricula = null;
    f.cartorio = null;
    const campos = prepararCamposSimil(f);
    expect(campos.find((c) => c.campo === "matricula")?.estado).toBe("ausente");
    expect(campos.find((c) => c.campo === "cartorio")?.estado).toBe("validado");
    expect(resumoDosCampos(campos).ausentes).toBe(1);
  });
  it("campo com divergência aberta fica para revisar", () => {
    const f = fonte();
    f.camposEmRevisao = ["areaM2"];
    expect(prepararCamposSimil(f).find((c) => c.campo === "area_m2")?.estado).toBe("revisar");
  });
  it("execução real ainda não existe e diz isso, sem fingir sucesso", async () => {
    await expect(executarSimil([])).rejects.toMatchObject({ codigo: "DRIVER_NOT_AVAILABLE", retentavel: false });
  });
});

describe("erros tipados", () => {
  it("explica qualquer código, inclusive desconhecido", () => {
    expect(explicarErro("VALIDATION_BLOCKED").podeTentarDeNovo).toBe(false);
    expect(explicarErro("NETWORK_TIMEOUT").podeTentarDeNovo).toBe(true);
    expect(explicarErro("nada-disso").titulo).toBe("Erro não classificado");
  });
  it("retentável segue a tabela, salvo quando forçado", () => {
    expect(new ErroAutomacao("NETWORK_TIMEOUT", "x").retentavel).toBe(true);
    expect(new ErroAutomacao("NETWORK_TIMEOUT", "x", { retentavel: false }).retentavel).toBe(false);
    expect(new ErroAutomacao("MISSING_REQUIRED_DATA", "x").retentavel).toBe(false);
  });
});
