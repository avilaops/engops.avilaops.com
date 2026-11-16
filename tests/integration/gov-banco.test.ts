import { PrismaClient } from "@prisma/client";
import { beforeAll, beforeEach, afterAll, describe, expect, it, vi } from "vitest";
import type { Operador } from "@/lib/tenant";
import type { OportunidadeGov } from "@/integracoes/gov";

const mocks = vi.hoisted(() => ({ consultar: vi.fn() }));
vi.mock("@/lib/prisma", async () => {
  const { PrismaClient } = await import("@prisma/client");
  return { prisma: process.env.GOV_TEST_DATABASE_URL ? new PrismaClient({ datasourceUrl: process.env.GOV_TEST_DATABASE_URL }) : {} };
});
vi.mock("@/integracoes/gov", async original => ({ ...await original<typeof import("@/integracoes/gov")>(), consultarGov: mocks.consultar }));
import { prisma } from "@/lib/prisma";
import { indexarGov } from "@/servicos/gov-ingestao";
import { buscarGlobalGov, analisarGlobalGov } from "@/servicos/gov-busca";
import { criarRegraGov, alertarPrazosGov, desativarRegraGov } from "@/servicos/gov-alertas";
import { salvarOportunidadeGov } from "@/servicos/gov";
import { reservarColetaGov, cicloColetaGov } from "@/automation/gov-coleta";
import { controlarColetaGov } from "@/servicos/gov-coletas";

const url = process.env.GOV_TEST_DATABASE_URL;
const agora = new Date();
const instante = (horas: number) => new Date(agora.getTime() + horas * 3600000).toISOString();
const item = (n: number, extra: Partial<OportunidadeGov> = {}): OportunidadeGov => ({
  id: `12345678000190-1-${String(n).padStart(6, "0")}/2026`, fonte: "PNCP", tipo: "CONTRATACAO",
  objeto: "Manutenção de escolas", orgao: "Município", cnpj: "12345678000190", uf: "SP", municipio: "Cidade", modalidade: "Pregão eletrônico", situacao: "Divulgada",
  valor: 100, publicado: instante(-2), prazo: instante(24), atualizado: instante(-1), ano: 2026,
  url: `https://pncp.gov.br/app/editais/12345678000190/2026/${n}`, ...extra,
});
let op: Operador, outro: Operador;
const gravar = (i: OportunidadeGov) => prisma.$transaction(tx => indexarGov(tx, i), { timeout: 30000 });

describe.skipIf(!url)("GOV • PostgreSQL real, busca global, coleta e isolamento", () => {
  beforeAll(() => {
    const banco = new URL(url!).pathname.slice(1);
    if (!/^engops_(?:(?:gov|siop)_test_[a-z0-9_]+|test)$/.test(banco)) throw new Error("Banco não é de teste isolado; nenhuma limpeza será executada.");
  });
  beforeEach(async () => {
    vi.clearAllMocks();
    await prisma.govAviso.deleteMany(); await prisma.notificacao.deleteMany();
    await prisma.oportunidadeGovSalva.deleteMany(); await prisma.govRegraAlerta.deleteMany();
    await prisma.govRegistro.deleteMany(); await prisma.govColeta.deleteMany();
    await prisma.auditoria.deleteMany(); await prisma.membro.deleteMany(); await prisma.empresa.deleteMany();
    const a = await prisma.empresa.create({ data: { nome: "Empresa sintética A", slug: "teste-gov-a" } });
    const b = await prisma.empresa.create({ data: { nome: "Empresa sintética B", slug: "teste-gov-b" } });
    for (const empresa of [a, b]) await prisma.membro.create({ data: { empresaId: empresa.id, email: "gov@example.test", nome: "Usuário de teste", papel: "ADMIN" } });
    op = { empresa: { id: a.id }, email: "gov@example.test", papel: "ADMIN" } as Operador;
    outro = { ...op, empresa: { ...op.empresa, id: b.id } };
  }, 30000);
  afterAll(async () => { if (url) await (prisma as PrismaClient).$disconnect(); });

  it("pesquisa toda a base além da primeira página e agrega sem duplicar PNCP entre fontes", async () => {
    for (let n = 1; n <= 35; n++) await gravar(item(n, { objeto: n === 35 ? "Energia solar fotovoltaica" : "Manutenção de escolas", valor: n === 35 ? null : 100 }));
    await gravar(item(1, { fonte: "COMPRAS" }));
    expect(await prisma.govRegistro.count()).toBe(35);
    expect((await buscarGlobalGov({ busca: "energia solar" })).total).toBe(1);
    const pagina = await buscarGlobalGov({ busca: "manutencao", pagina: 2 });
    expect(pagina.total).toBe(34); expect(pagina.itens).toHaveLength(4);
    expect(pagina.totais[0].valor?.toString()).toBe("3400");
    const grupos = await analisarGlobalGov({});
    expect(grupos.orgaos[0].quantidade).toBe(35n);
    expect(grupos.orgaos[0].valor?.toString()).toBe("3400");
  }, 120000);
  it("preserva nota privada, atualiza salvos e notifica alteração uma única vez", async () => {
    await gravar(item(1));
    const salva = await salvarOportunidadeGov(op, item(1));
    await prisma.oportunidadeGovSalva.update({ where: { id: salva.id }, data: { notas: "Nota privada", situacao: "INTERESSE" } });
    const novo = item(1, { prazo: instante(36), atualizado: instante(0) });
    await gravar(novo); await gravar(novo);
    const depois = await prisma.oportunidadeGovSalva.findUniqueOrThrow({ where: { id: salva.id } });
    expect(depois.notas).toBe("Nota privada"); expect(depois.situacao).toBe("INTERESSE");
    expect((depois.dados as OportunidadeGov).prazo).toBe(novo.prazo);
    expect(await prisma.notificacao.count({ where: { empresaId: op.empresa.id } })).toBe(1);
    expect(await prisma.notificacao.count({ where: { empresaId: outro.empresa.id } })).toBe(0);
    await alertarPrazosGov(agora); await alertarPrazosGov(agora);
    expect(await prisma.govAviso.count({ where: { tipo: "PRAZO" } })).toBe(1);
  }, 120000);
  it("não retrocede com dado antigo nem envia alertas de buscas a outra empresa", async () => {
    const regra = await criarRegraGov(op, "Energia", { busca: "energia" });
    await prisma.govRegraAlerta.update({ where: { id: regra.id }, data: { criadoEm: new Date(agora.getTime() - 86400000) } });
    await gravar(item(1, { objeto: "Energia solar", atualizado: instante(0) }));
    await gravar(item(1, { objeto: "Registro antigo", atualizado: instante(-48) }));
    expect((await buscarGlobalGov({ busca: "energia" })).total).toBe(1);
    expect(await prisma.notificacao.count({ where: { empresaId: op.empresa.id } })).toBe(1);
    expect(await prisma.notificacao.count({ where: { empresaId: outro.empresa.id } })).toBe(0);
    expect((await desativarRegraGov(outro, regra.id)).count).toBe(0);
  }, 120000);
  it("conclui a janela PCA mensal já paginada e mantém a nova janela diária nas páginas seguintes", async () => {
    await prisma.govColeta.create({ data: { id: "pca-migracao", fonte: "planejamento", historica: true, inicio: new Date("2023-04-21"), cursor: { dia: "2023-04-21", pagina: 2, modalidade: 1 }, habilitada: true } });
    mocks.consultar.mockResolvedValue({ itens: [], paginas: 2 });
    await cicloColetaGov();
    expect(mocks.consultar.mock.calls[0][0]).toMatchObject({ inicio: "2023-04-21", fim: "2023-05-20", pagina: 2 });
    const primeiro = await prisma.govColeta.findUniqueOrThrow({ where: { id: "pca-migracao" } });
    expect(primeiro.cursor).toMatchObject({ dia: "2023-05-21", pagina: 1 });
    await prisma.govColeta.update({ where: { id: primeiro.id }, data: { proximaEm: new Date(0) } });
    await cicloColetaGov();
    expect(mocks.consultar.mock.calls[1][0]).toMatchObject({ inicio: "2023-05-21", fim: "2023-05-21", pagina: 1 });
    expect((await prisma.govColeta.findUniqueOrThrow({ where: { id: primeiro.id } })).cursor).toMatchObject({ dia: "2023-05-21", pagina: 2, janelaDias: 1 });
    await prisma.govColeta.update({ where: { id: primeiro.id }, data: { proximaEm: new Date(0) } });
    await cicloColetaGov();
    expect(mocks.consultar.mock.calls[2][0]).toMatchObject({ inicio: "2023-05-21", fim: "2023-05-21", pagina: 2 });
    const final = await prisma.govColeta.findUniqueOrThrow({ where: { id: primeiro.id } });
    expect(final.cursor).toMatchObject({ dia: "2023-05-22", pagina: 1, janelaDias: 1 });
    expect(final.cobertoAte?.toISOString()).toBe("2023-05-21T23:59:59.000Z");
  }, 120000);
  it("reserva uma coleta por worker, recupera lease vencida e não avança cursor após falha", async () => {
    const cursor = { dia: "2026-11-01", pagina: 1, modalidade: 1 };
    await prisma.govColeta.create({ data: { id: "teste", fonte: "compras", inicio: agora, cursor, habilitada: true } });
    const reservas = await Promise.all([reservarColetaGov("worker-a"), reservarColetaGov("worker-b")]);
    expect(reservas.filter(Boolean)).toHaveLength(1);
    await prisma.govColeta.update({ where: { id: "teste" }, data: { reservaAte: new Date(0) } });
    mocks.consultar.mockRejectedValueOnce(new Error("HTTP 503"));
    await cicloColetaGov();
    const falhou = await prisma.govColeta.findUniqueOrThrow({ where: { id: "teste" } });
    expect(falhou.cursor).toEqual(cursor); expect(falhou.falhas).toBe(1);
    await prisma.govColeta.update({ where: { id: "teste" }, data: { proximaEm: new Date(0) } });
    mocks.consultar.mockResolvedValueOnce({ itens: [item(1)], paginas: 2 });
    await cicloColetaGov();
    expect((await prisma.govColeta.findUniqueOrThrow({ where: { id: "teste" } })).cursor).toEqual({ ...cursor, pagina: 2 });
    expect(await prisma.govRegistro.count()).toBe(1);
  }, 120000);
  it("pausa uma coleta em andamento, conclui a página e retoma do checkpoint sem refazer dados", async () => {
    const cursor = { dia: "2026-11-01", pagina: 1, modalidade: 1 };
    await prisma.govColeta.create({ data: { id: "controle", fonte: "compras", inicio: agora, cursor, habilitada: true } });
    const dono = { ...op, dono: true };
    let liberar!: (resultado: { itens: OportunidadeGov[]; paginas: number }) => void;
    let avisarReserva!: () => void;
    const iniciou = new Promise<void>(resolve => { avisarReserva = resolve; });
    mocks.consultar.mockImplementationOnce(() => {
      avisarReserva();
      return new Promise(resolve => { liberar = resolve; });
    });
    const primeiraPagina = cicloColetaGov();
    await iniciou;
    const reservada = await prisma.govColeta.findUniqueOrThrow({ where: { id: "controle" } });
    await expect(controlarColetaGov(op, "controle", "pausar")).rejects.toThrow(/dono da plataforma/);
    await controlarColetaGov(dono, "controle", "pausar");
    const pausando = await prisma.govColeta.findUniqueOrThrow({ where: { id: "controle" } });
    expect(pausando.reservadoPor).toBe(reservada.reservadoPor);
    expect(pausando.reservaAte).toEqual(reservada.reservaAte);
    liberar({ itens: [item(1)], paginas: 2 });
    await primeiraPagina;
    const pausada = await prisma.govColeta.findUniqueOrThrow({ where: { id: "controle" } });
    expect(pausada.habilitada).toBe(false);
    expect(pausada.cursor).toEqual({ ...cursor, pagina: 2 });
    expect(pausada.paginas).toBe(1);
    expect(await cicloColetaGov()).toBe(false);
    expect(mocks.consultar).toHaveBeenCalledTimes(1);
    await controlarColetaGov(dono, "controle", "retomar");
    await controlarColetaGov(dono, "controle", "retomar");
    mocks.consultar.mockResolvedValueOnce({ itens: [item(2)], paginas: 2 });
    await cicloColetaGov();
    expect(mocks.consultar.mock.calls[1][0].pagina).toBe(2);
    expect(await prisma.govRegistro.count()).toBe(2);
    expect(await prisma.auditoria.count({ where: { acao: { startsWith: "gov.coleta." } } })).toBe(2);
  }, 120000);
  it("desfaz a mudança de coleta se a auditoria não puder ser gravada", async () => {
    await prisma.govColeta.create({ data: { id: "controle", fonte: "compras", inicio: agora, cursor: { dia: "2026-11-01", pagina: 1, modalidade: 1 }, habilitada: true } });
    await expect(controlarColetaGov({ ...op, dono: true, empresa: { ...op.empresa, id: "empresa-inexistente" } }, "controle", "pausar")).rejects.toThrow();
    expect((await prisma.govColeta.findUniqueOrThrow({ where: { id: "controle" } })).habilitada).toBe(true);
  }, 120000);
  it("rejeita alteração de regra por papel de consulta antes de gravar", async () => {
    await expect(criarRegraGov({ ...op, papel: "CONSULTA" }, "Sem permissão", {})).rejects.toThrow(/permissão/);
    expect(await prisma.govRegraAlerta.count()).toBe(0);
  }, 120000);
  it("reutiliza salvo anterior do Compras quando o catálogo passa a preferir PNCP", async () => {
    const salva = await salvarOportunidadeGov(op, item(1, { fonte: "COMPRAS" }));
    await prisma.oportunidadeGovSalva.update({ where: { id: salva.id }, data: { notas: "Preservar análise" } });
    await gravar(item(1));
    await salvarOportunidadeGov(op, item(1));
    expect(await prisma.oportunidadeGovSalva.count({ where: { empresaId: op.empresa.id } })).toBe(1);
    expect((await prisma.oportunidadeGovSalva.findUniqueOrThrow({ where: { id: salva.id } })).notas).toBe("Preservar análise");
  }, 120000);
  it("desfaz toda a página quando um registro falha e mantém o checkpoint", async () => {
    const cursor = { dia: "2026-11-01", pagina: 1, modalidade: 1 };
    await prisma.govColeta.create({ data: { id: "teste", fonte: "compras", inicio: agora, cursor, habilitada: true } });
    mocks.consultar.mockResolvedValueOnce({ itens: [item(1), item(2, { url: "https://nao-oficial.example" })], paginas: 2 });
    await cicloColetaGov();
    expect(await prisma.govRegistro.count()).toBe(0);
    expect((await prisma.govColeta.findUniqueOrThrow({ where: { id: "teste" } })).cursor).toEqual(cursor);
  }, 120000);
});
