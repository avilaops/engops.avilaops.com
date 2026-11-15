import { afterEach, describe, expect, it, vi } from "vitest";
import { consultarGov, esquemaFiltrosGov, filtrarPaginaGov } from "@/integracoes/gov";

afterEach(() => vi.unstubAllGlobals());
const resposta = (body: unknown, status = 200) => vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status })));

describe("Central GOV • fontes oficiais", () => {
  it("respeita os limites reais de página do PNCP inclusive PCA", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
    await consultarGov({ fonte: "abertas" }, { tamanhoPagina: 500 });
    expect(new URL(String(vi.mocked(fetch).mock.calls[0][0])).searchParams.get("tamanhoPagina")).toBe("50");
    await consultarGov({ fonte: "planejamento" }, { tamanhoPagina: 5 });
    expect(new URL(String(vi.mocked(fetch).mock.calls[1][0])).searchParams.get("tamanhoPagina")).toBe("10");
    await consultarGov({ fonte: "compras" }, { tamanhoPagina: 500 });
    expect(new URL(String(vi.mocked(fetch).mock.calls[2][0])).searchParams.get("tamanhoPagina")).toBe("500");
  });
  it("consulta todas as áreas e preserva ausência de valor, paginação e link oficial", async () => {
    resposta({ data: [{ numeroControlePNCP: "12345678000190-1-000005/2026", objetoCompra: "Serviços gerais", orgaoEntidade: { cnpj: "12345678000190", razaoSocial: "Órgão" }, unidadeOrgao: { ufSigla: "SP" }, anoCompra: 2026, sequencialCompra: 5 }], totalRegistros: 37, totalPaginas: 2 });
    const r = await consultarGov({ fonte: "abertas", pagina: 2, fim: "2026-12-31" });
    expect(r.total).toBe(37);
    expect(r.paginas).toBe(2);
    expect(r.itens[0].valor).toBeNull();
    expect(r.itens[0].url).toBe("https://pncp.gov.br/app/editais/12345678000190/2026/5");
    const url = String(vi.mocked(fetch).mock.calls[0][0]);
    expect(url).toContain("pagina=2");
    expect(url).not.toMatch(/cnpj=|codigoModalidadeContratacao=|CNAE/i);
  });
  it("expande itens de PCA sem perder ano ou identidade do plano", async () => {
    resposta({ data: [{ idPcaPncp: "12345678000190-0-000001/2027", orgaoEntidadeCnpj: "12345678000190", orgaoEntidadeRazaoSocial: "Órgão", anoPca: 2027, itens: [{ numeroItem: 1, descricaoItem: "Nuvem", valorTotal: 10, dataDesejada: "2027-04-01" }, { numeroItem: 2, descricaoItem: "Pintura", valorTotal: 0 }] }], totalRegistros: 1, totalPaginas: 1 });
    const r = await consultarGov({ fonte: "planejamento", inicio: "2026-11-14", fim: "2026-11-15" });
    expect(r.unidadePaginacao).toBe("planos");
    expect(r.itens).toHaveLength(2);
    expect(r.itens[0].ano).toBe(2027);
    expect(r.itens[0].prazo).toBe("2027-04-01");
    expect(r.itens[0].id).not.toBe(r.itens[1].id);
    expect(r.itens[1].valor).toBe(0);
  });
  it("não transforma falha ou formato desconhecido em lista vazia", async () => {
    resposta({}, 503);
    await expect(consultarGov({ fonte: "abertas" })).rejects.toThrow(/503/);
    resposta({ inesperado: [] });
    await expect(consultarGov({ fonte: "abertas" })).rejects.toThrow(/formato/i);
  });
  it("trata 204 como ausência legítima", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
    expect((await consultarGov({ fonte: "abertas" })).itens).toEqual([]);
  });
  it("consulta pregões atuais do Compras sem confundir códigos de modalidade PNCP", async () => {
    resposta({ resultado: [{ numeroControlePNCP: "12345678000190-1-000005/2026", objetoCompra: "Software", orgaoEntidadeCnpj: "12345678000190", orgaoEntidadeRazaoSocial: "Órgão", anoCompraPncp: 2026, sequencialCompraPncp: 5, dataEncerramentoPropostaPncp: "2026-12-01", modalidadeNome: "Pregão eletrônico", unidadeOrgaoUfSigla: "SP" }], totalRegistros: 1, totalPaginas: 1 });
    const r = await consultarGov({ fonte: "compras", modalidade: 6, inicio: "2026-11-01", fim: "2026-11-15", busca: "Software" });
    expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain("codigoModalidade=5");
    expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain("objetoCompra=Software");
    expect(r.itens[0].fonte).toBe("COMPRAS");
    expect(r.itens[0].uf).toBe("SP");
    expect(r.itens[0].prazo).toBe("2026-12-01");
  });
  it("valida datas reais, intervalo, UF, modalidade e limites antes da consulta", () => {
    for (const dados of [{ pagina: 0 }, { uf: "XX" }, { inicio: "2026-02-30" }, { inicio: "2026-12-01", fim: "2026-01-01" }, { modalidade: 99 }]) expect(esquemaFiltrosGov.safeParse(dados).success).toBe(false);
  });
  it("normaliza resultado legado e mantém busca local explícita", async () => {
    resposta({ resultado: [{ id_compra: "12345605000012023", tx_objeto: "Manutenção predial", no_orgao: "Órgão", co_uasg: 123456, dt_data_edital: "2023-01-02", dt_fim_proposta: "2023-01-20", valor_estimado_total: 100 }], totalRegistros: 1, totalPaginas: 1 });
    const r = await consultarGov({ fonte: "pregoes", inicio: "2023-01-01", fim: "2023-01-03" });
    expect(r.itens[0].fonte).toBe("COMPRAS");
    expect(r.itens[0].prazo).toBe("2023-01-20");
    expect(filtrarPaginaGov(r.itens, { busca: "manutencao", minimo: 50 })).toHaveLength(1);
    expect(filtrarPaginaGov(r.itens, { busca: "pintura" })).toHaveLength(0);
  });
});
