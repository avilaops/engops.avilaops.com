import { describe, expect, it } from "vitest";
import { chaveGov, fingerprintGov, normalizarBuscaGov, esquemaBuscaGlobal, proximoCursorGov, atrasoGov, janelaColetaGov } from "@/dominio/gov-catalogo";
import type { OportunidadeGov } from "@/integracoes/gov";

const item = { id: "12345678000190-1-000005/2026", tipo: "CONTRATACAO", fonte: "PNCP", objeto: "Manutenção", orgao: "Órgão", cnpj: "12345678000190", uf: "SP", municipio: "Cidade", modalidade: "Pregão eletrônico", situacao: "Divulgada", valor: 10, publicado: "2026-11-01", prazo: "2026-11-20", atualizado: "2026-11-02", ano: 2026, url: "https://pncp.gov.br/app/editais/12345678000190/2026/5" } as OportunidadeGov;
describe("catálogo global GOV", () => {
  it("usa dias para PCA sem mudar o intervalo de uma página mensal já iniciada", () => {
    const cursor = { dia: "2023-04-21", pagina: 1, modalidade: 1 };
    expect(janelaColetaGov("planejamento", true, cursor)).toBe(1);
    expect(janelaColetaGov("planejamento", true, { ...cursor, pagina: 2 })).toBe(30);
    const diario = { ...cursor, janelaDias: 1 as const };
    expect(janelaColetaGov("planejamento", true, proximoCursorGov(diario, 2, [1]))).toBe(1);
    const seguinte = proximoCursorGov({ ...diario, pagina: 2 }, 2, [1]);
    expect(seguinte).toMatchObject({ dia: "2023-04-22", pagina: 1, janelaDias: 1 });
    expect(janelaColetaGov("compras", true, cursor)).toBe(30);
    expect(janelaColetaGov("planejamento", false, cursor)).toBe(1);
  });
  it("deduplica a identificação PNCP entre fontes sem misturar legado ou itens de planos", () => {
    expect(chaveGov(item)).toBe(chaveGov({ ...item, fonte: "COMPRAS" }));
    expect(chaveGov({ ...item, tipo: "PREGAO", id: "123" })).toBe("compras:123");
    expect(chaveGov({ ...item, tipo: "PLANEJAMENTO", id: "plano#1" })).not.toBe(chaveGov({ ...item, tipo: "PLANEJAMENTO", id: "plano#2" }));
  });
  it("ignora troca de fonte e horário de consulta mas detecta alteração relevante", () => {
    expect(fingerprintGov(item)).toBe(fingerprintGov({ ...item, fonte: "COMPRAS", atualizado: "2026-11-03" }));
    expect(fingerprintGov(item)).not.toBe(fingerprintGov({ ...item, prazo: "2026-11-25" }));
  });
  it("normaliza acentos e valida filtros globais", () => {
    expect(normalizarBuscaGov("MANUTENÇÃO Pública")).toBe("manutencao publica");
    expect(esquemaBuscaGlobal.parse({ uf: "SP", tipo: "PLANEJAMENTO" }).uf).toBe("SP");
    expect(esquemaBuscaGlobal.safeParse({ uf: "XX" }).success).toBe(false);
    expect(esquemaBuscaGlobal.safeParse({ minimo: 50, maximo: 10 }).success).toBe(false);
  });
  it("avança somente após página concluída e reinicia página ao mudar o período", () => {
    const cursor = { dia: "2026-11-01", pagina: 1, modalidade: 6 };
    expect(proximoCursorGov(cursor, 3, [6, 8])).toEqual({ ...cursor, pagina: 2 });
    expect(proximoCursorGov({ ...cursor, pagina: 3 }, 3, [6, 8])).toEqual({ ...cursor, modalidade: 8 });
    expect(proximoCursorGov({ ...cursor, modalidade: 8 }, 1, [6, 8])).toEqual({ dia: "2026-11-02", pagina: 1, modalidade: 6 });
    expect(atrasoGov(20)).toBeLessThanOrEqual(3600000);
    expect(atrasoGov(2)).toBeGreaterThan(atrasoGov(1));
  });
});
