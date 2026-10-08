import { describe, expect, it } from "vitest";
import { detectarPendencias, pronta, validarCpfCnpj, validarCruzado, validarTudo, type RetratoDemanda } from "@/dominio/validacao";

const completa = (): RetratoDemanda => ({
  numeroOs: "18453",
  endereco: "Rua das Flores",
  numero: "10",
  municipio: "Curitiba",
  uf: "PR",
  cep: "80000-000",
  matricula: "12345",
  areaM2: 184.32,
  tipoImovel: "Casa",
  proprietarioNome: "João da Silva",
  proprietarioDoc: "529.982.247-25",
  prazo: new Date("2026-09-20"),
  documentos: [
    { id: "1", tipo: "OS", nomeArquivo: "ENG-0001_01-Entrada_OS_v1.pdf", dados: null },
    { id: "2", tipo: "MATRICULA", nomeArquivo: "ENG-0001_02-Imovel_MATRICULA_v1.pdf", dados: null },
    { id: "3", tipo: "DOC_PROPRIETARIO", nomeArquivo: "ENG-0001_03-Proprietario_DOC_PROPRIETARIO_v1.pdf", dados: null },
  ],
});

describe("CPF/CNPJ", () => {
  it("aceita válidos e recusa inválidos", () => {
    expect(validarCpfCnpj("529.982.247-25")).toBe(true);
    expect(validarCpfCnpj("111.111.111-11")).toBe(false);
    expect(validarCpfCnpj("123.456.789-00")).toBe(false);
    expect(validarCpfCnpj("11.222.333/0001-81")).toBe(true);
    expect(validarCpfCnpj("11.222.333/0001-80")).toBe(false);
  });
});

describe("detector de pendências", () => {
  it("demanda completa não tem bloqueio", () => {
    const p = detectarPendencias(completa());
    expect(p.filter((x) => x.severidade === "BLOQUEIA")).toEqual([]);
    expect(pronta(p)).toBe(true);
  });
  it("aponta matrícula ausente e documento faltando", () => {
    const r = completa();
    r.matricula = null;
    r.documentos = r.documentos.filter((d) => d.tipo !== "MATRICULA");
    const codigos = detectarPendencias(r).map((p) => p.codigo);
    expect(codigos).toContain("MATRICULA_AUSENTE");
    expect(codigos).toContain("DOC_MATRICULA_AUSENTE");
    expect(pronta(detectarPendencias(r))).toBe(false);
  });
  it("CPF inválido bloqueia", () => {
    const r = completa();
    r.proprietarioDoc = "123.456.789-00";
    expect(detectarPendencias(r).some((p) => p.codigo === "CPF_INVALIDO" && p.severidade === "BLOQUEIA")).toBe(true);
  });
  it("prazo ausente é só aviso", () => {
    const r = completa();
    r.prazo = null;
    const p = detectarPendencias(r).find((x) => x.codigo === "PRAZO_AUSENTE");
    expect(p?.severidade).toBe("AVISO");
  });
});

describe("validador cruzado", () => {
  it("nome com variação de preposição é aviso, não bloqueio", () => {
    const r = completa();
    r.documentos[1].dados = { proprietarioNome: "João Silva" };
    const p = validarCruzado(r);
    expect(p).toHaveLength(1);
    expect(p[0].codigo).toBe("DIVERGENCIA_PROPRIETARIONOME");
    expect(p[0].severidade).toBe("AVISO");
  });
  it("nome de outra pessoa bloqueia", () => {
    const r = completa();
    r.documentos[1].dados = { proprietarioNome: "Maria Souza" };
    expect(validarCruzado(r)[0].severidade).toBe("BLOQUEIA");
  });
  it("área diferente bloqueia e mostra os dois valores", () => {
    const r = completa();
    r.documentos[1].dados = { areaM2: "183,32" };
    const p = validarCruzado(r);
    expect(p[0].codigo).toBe("DIVERGENCIA_AREA");
    expect(p[0].severidade).toBe("BLOQUEIA");
    expect(p[0].detalhe).toContain("184.32");
    expect(p[0].detalhe).toContain("183.32");
  });
  it("mesma área com vírgula e ponto não diverge", () => {
    const r = completa();
    r.documentos[1].dados = { areaM2: "184,32", matricula: "012345", proprietarioDoc: "52998224725" };
    expect(validarCruzado(r)).toEqual([]);
  });
  it("documento sem conferência não gera divergência", () => {
    expect(validarCruzado(completa())).toEqual([]);
  });
  it("validarTudo junta detector e cruzado", () => {
    const r = completa();
    r.cep = null;
    r.documentos[0].dados = { numeroOs: "99999" };
    const codigos = validarTudo(r).map((p) => p.codigo);
    expect(codigos).toContain("CEP_AUSENTE");
    expect(codigos).toContain("DIVERGENCIA_NUMEROOS");
  });
});
