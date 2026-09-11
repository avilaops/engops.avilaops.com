import { describe, expect, it } from "vitest";
import { pode } from "@/lib/rbac";
import { abasCelular, abasDoPapel, navegacao, navegacaoDoPapel } from "@/lib/navegacao";
import { prazoRelativo } from "@/lib/formatos";
import { nomePadronizado, sugerirTipo } from "@/dominio/documentos";

describe("RBAC", () => {
  it("consulta só lê", () => {
    expect(pode("CONSULTA", "demanda.ver")).toBe(true);
    expect(pode("CONSULTA", "demanda.criar")).toBe(false);
    expect(pode("CONSULTA", "automacao.aprovar")).toBe(false);
  });
  it("operador prepara mas não aprova; revisor aprova mas não cria", () => {
    expect(pode("OPERADOR", "automacao.preparar")).toBe(true);
    expect(pode("OPERADOR", "automacao.aprovar")).toBe(false);
    expect(pode("REVISOR", "automacao.aprovar")).toBe(true);
    expect(pode("REVISOR", "demanda.criar")).toBe(false);
  });
  it("só admin administra a empresa", () => {
    expect(pode("ADMIN", "empresa.administrar")).toBe(true);
    expect(pode("GESTOR", "empresa.administrar")).toBe(false);
  });
});

describe("navegação", () => {
  it("menu do papel esconde o que a rota recusaria", () => {
    const hrefs = navegacaoDoPapel("OPERADOR").flatMap((g) => g.items.map((i) => i.href));
    expect(hrefs).not.toContain("/equipe");
    expect(hrefs).not.toContain("/aprovacoes");
    expect(hrefs).toContain("/demandas/nova");
  });
  it("sem seção duplicada e no máximo quatro abas", () => {
    const secoes = navegacao.flatMap((g) => g.items.map((i) => i.section));
    expect(new Set(secoes).size).toBe(secoes.length);
    expect(abasCelular.length).toBeLessThanOrEqual(4);
    expect(abasDoPapel("CONSULTA").length).toBeLessThan(abasCelular.length);
  });
  it("toda aba aponta para um destino do menu", () => {
    const hrefs = new Set(navegacao.flatMap((g) => g.items.map((i) => i.href)));
    for (const aba of abasCelular) expect(hrefs.has(aba.href), aba.href).toBe(true);
  });
});

describe("prazo relativo", () => {
  const agora = new Date(2026, 8, 11, 15, 0);
  it("classifica", () => {
    expect(prazoRelativo(new Date(2026, 8, 9), agora)).toEqual({ texto: "atrasada 2 dias", tom: "atrasada" });
    expect(prazoRelativo(new Date(2026, 8, 11, 23), agora).tom).toBe("hoje");
    expect(prazoRelativo(new Date(2026, 8, 12), agora).texto).toBe("amanhã");
    expect(prazoRelativo(new Date(2026, 8, 20), agora).tom).toBe("ok");
    expect(prazoRelativo(null, agora).tom).toBe("sem");
  });
});

describe("documentos", () => {
  it("sugere tipo pelo nome e devolve null quando não sabe", () => {
    expect(sugerirTipo("OS_18453.pdf")).toBe("OS");
    expect(sugerirTipo("matricula-12345.pdf")).toBe("MATRICULA");
    expect(sugerirTipo("IMG_0231.jpeg")).toBe("FOTO");
    expect(sugerirTipo("qualquercoisa.bin")).toBeNull();
  });
  it("nome padronizado carrega código, pasta, tipo, versão e extensão", () => {
    expect(nomePadronizado("ENG-0007", "IMOVEL", "MATRICULA", 2, "Matrícula Atualizada.PDF")).toBe("ENG-0007_02-Imovel_MATRICULA_v2.pdf");
  });
});
