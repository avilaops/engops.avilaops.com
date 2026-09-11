import { describe, expect, it } from "vitest";
import { calcularChecklist, proximaAcao, type EntradaChecklist } from "@/dominio/checklist";

const base = (): EntradaChecklist => ({
  status: "EM_PREPARACAO",
  documentosPorTipo: new Set(["OS", "MATRICULA", "DOC_PROPRIETARIO"]),
  problemas: [],
  execucoes: [],
  temPacoteFinal: false,
});

describe("checklist calculado", () => {
  it("documentos presentes ficam OK e os ausentes PENDENTE ou BLOQUEADO", () => {
    const e = base();
    e.documentosPorTipo.delete("MATRICULA");
    e.problemas.push({ codigo: "DOC_MATRICULA_AUSENTE", severidade: "BLOQUEIA", titulo: "Falta", origem: "DETECTOR" });
    const itens = calcularChecklist(e);
    expect(itens.find((i) => i.chave === "doc.OS")?.estado).toBe("OK");
    expect(itens.find((i) => i.chave === "doc.MATRICULA")?.estado).toBe("BLOQUEADO");
    expect(itens.find((i) => i.chave === "doc.FOTO")?.estado).toBe("PENDENTE");
  });
  it("divergência bloqueante marca o item cruzado como BLOQUEADO", () => {
    const e = base();
    e.problemas.push({ codigo: "DIVERGENCIA_AREA", severidade: "BLOQUEIA", titulo: "Área diverge", origem: "CRUZADO" });
    expect(calcularChecklist(e).find((i) => i.chave === "dados.cruzado")?.estado).toBe("BLOQUEADO");
  });
  it("SIMIL concluído marca preparar e enviar como OK", () => {
    const e = base();
    e.execucoes.push({ sistema: "SIMIL", status: "CONCLUIDA" });
    const itens = calcularChecklist(e);
    expect(itens.find((i) => i.chave === "simil.preparar")?.estado).toBe("OK");
    expect(itens.find((i) => i.chave === "simil.enviar")?.estado).toBe("OK");
    expect(itens.find((i) => i.chave === "rae.gerar")?.estado).toBe("PENDENTE");
  });
  it("as chaves são únicas", () => {
    const chaves = calcularChecklist(base()).map((i) => i.chave);
    expect(new Set(chaves).size).toBe(chaves.length);
  });
});

describe("próxima ação", () => {
  it("com tudo pronto sugere preparar o SIMIL", () => {
    expect(proximaAcao(base()).acao).toBe("preparar-simil");
  });
  it("com documento faltando pede documentos antes de tudo", () => {
    const e = base();
    e.problemas.push({ codigo: "DOC_OS_AUSENTE", severidade: "BLOQUEIA", titulo: "Falta OS", origem: "DETECTOR" });
    e.problemas.push({ codigo: "DIVERGENCIA_AREA", severidade: "BLOQUEIA", titulo: "Área", origem: "CRUZADO" });
    expect(proximaAcao(e).acao).toBe("documentos");
  });
  it("com divergência pede para resolver", () => {
    const e = base();
    e.problemas.push({ codigo: "DIVERGENCIA_AREA", severidade: "BLOQUEIA", titulo: "Área", origem: "CRUZADO" });
    expect(proximaAcao(e).acao).toBe("resolver");
  });
  it("aviso não impede a preparação", () => {
    const e = base();
    e.problemas.push({ codigo: "CEP_AUSENTE", severidade: "AVISO", titulo: "CEP", origem: "DETECTOR" });
    expect(proximaAcao(e).acao).toBe("preparar-simil");
  });
  it("SIMIL preparado em sombra pede revisão; concluído pede o RAE", () => {
    const e = base();
    e.execucoes.push({ sistema: "SIMIL", status: "PREPARADA" });
    expect(proximaAcao(e).acao).toBe("revisar-sombra");
    e.execucoes[0].status = "AGUARDANDO_APROVACAO";
    expect(proximaAcao(e).acao).toBe("aprovar");
    e.execucoes[0].status = "CONCLUIDA";
    expect(proximaAcao(e).acao).toBe("gerar-rae");
  });
  it("entregue não tem ação", () => {
    const e = base();
    e.status = "ENTREGUE";
    expect(proximaAcao(e).acao).toBe("nada");
  });
});
