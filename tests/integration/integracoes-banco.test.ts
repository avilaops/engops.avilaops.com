import { PrismaClient } from "@prisma/client";
import { beforeAll, beforeEach, afterAll, describe, expect, it, vi } from "vitest";
import type { Operador } from "@/lib/tenant";

vi.mock("@/lib/prisma", async () => {
  const { PrismaClient } = await import("@prisma/client");
  return { prisma: process.env.INTEGRACOES_TEST_DATABASE_URL ? new PrismaClient({ datasourceUrl: process.env.INTEGRACOES_TEST_DATABASE_URL, transactionOptions: { timeout: 30000, maxWait: 30000 } }) : {} };
});
import { prisma } from "@/lib/prisma";
import { configurarOperacao, painelOperacao, registrarOperacaoManual } from "@/servicos/operacoes-externas";
import { obterRetornoSiop, listarConsultasSiop, obterConfiguracaoSiop, configurarSiop } from "@/servicos/siop";

const url = process.env.INTEGRACOES_TEST_DATABASE_URL;
let op: Operador, outro: Operador, demandaId: string, documentoId: string, documentoOutro: string;
const entradaConfig = { sistema: "SIOPI", portalUrl: "https://example.test/portal", unidade: "unidade-teste", operacao: "Consulta sintética", observacoes: "Somente banco isolado" };
const registro = () => ({ sistema: "SIOPI", demandaId, documentoId, protocolo: "protocolo-teste", observacoes: "Registro de teste" });

describe.skipIf(!url)("integrações • PostgreSQL isolado", () => {
  beforeAll(() => {
    if (!/^engops_(?:(?:gov|siop)_test_[a-z0-9_]+|test)$/.test(new URL(url!).pathname.slice(1))) throw new Error("Exige banco de testes isolado.");
  });
  beforeEach(async () => {
    await prisma.execucaoExterna.deleteMany(); await prisma.documento.deleteMany(); await prisma.demanda.deleteMany();
    await prisma.siopExecucaoOrcamentariaPac.deleteMany(); await prisma.siopRetorno.deleteMany(); await prisma.siopConsulta.deleteMany(); await prisma.siopCredencial.deleteMany();
    await prisma.configuracaoOperacional.deleteMany(); await prisma.auditoria.deleteMany();
    const empresas = await Promise.all(["a", "b"].map(slug => prisma.empresa.upsert({ where: { slug: `integracoes-teste-${slug}` }, create: { slug: `integracoes-teste-${slug}`, nome: `Empresa sintética ${slug}` }, update: {} })));
    op = { empresa: { id: empresas[0].id }, email: "integracoes@example.test", papel: "ADMIN", dono: true } as Operador;
    outro = { ...op, empresa: { ...op.empresa, id: empresas[1].id } };
    demandaId = (await prisma.demanda.create({ data: { empresaId: op.empresa.id, codigo: "ENG-0001", status: "SIOPI_PENDENTE", criadoPor: op.email } })).id;
    const outraDemanda = await prisma.demanda.create({ data: { empresaId: outro.empresa.id, codigo: "ENG-0001", criadoPor: outro.email } });
    for (const [demanda, empresa] of [[demandaId, op.empresa.id], [outraDemanda.id, outro.empresa.id]]) {
      const doc = await prisma.documento.create({ data: { empresaId: empresa, demandaId: demanda, categoria: "SIOPI", tipo: "SIOPI_COMPROVANTE", nomeOriginal: "teste.pdf", nomeArquivo: "teste.pdf", chave: "local:teste-isolado", mime: "application/pdf", tamanho: 1, hash: "hash-de-teste", enviadoPor: op.email } });
      if (empresa === op.empresa.id) documentoId = doc.id; else documentoOutro = doc.id;
    }
  }, 30000);
  afterAll(async () => { if (url) await (prisma as PrismaClient).$disconnect(); });

  it("mantém configuração e histórico restritos à empresa da sessão", async () => {
    await configurarOperacao(op, entradaConfig);
    await registrarOperacaoManual(op, registro());
    const painel = await painelOperacao(outro, "SIOPI");
    expect(painel.configuracao).toBeNull(); expect(painel.totalHistorico).toBe(0);
    expect((await painelOperacao(op, "SIOPI")).totalHistorico).toBe(1);
  }, 120000);
  it("recusa documento de outra empresa, documento removido e tipo incorreto", async () => {
    await expect(registrarOperacaoManual(op, { ...registro(), documentoId: documentoOutro })).rejects.toThrow(/comprovante/);
    await prisma.documento.update({ where: { id: documentoId }, data: { removidoEm: new Date() } });
    await expect(registrarOperacaoManual(op, registro())).rejects.toThrow(/comprovante/);
    await prisma.documento.update({ where: { id: documentoId }, data: { removidoEm: null, tipo: "OUTRO" } });
    await expect(registrarOperacaoManual(op, registro())).rejects.toThrow(/comprovante/);
    expect(await prisma.execucaoExterna.count()).toBe(0);
  }, 120000);
  it("recusa documento de outra demanda da mesma empresa e demanda arquivada", async () => {
    const outra = await prisma.demanda.create({ data: { empresaId: op.empresa.id, codigo: "ENG-0002", criadoPor: op.email } });
    await expect(registrarOperacaoManual(op, { ...registro(), demandaId: outra.id })).rejects.toThrow(/comprovante/);
    await prisma.demanda.update({ where: { id: demandaId }, data: { status: "ARQUIVADA" } });
    await expect(registrarOperacaoManual(op, registro())).rejects.toThrow(/arquivada/);
    expect(await prisma.execucaoExterna.count()).toBe(0);
  }, 120000);
  it("serializa cliques concorrentes, audita uma vez e preserva a etapa da demanda", async () => {
    const resultados = await Promise.all([registrarOperacaoManual(op, registro()), registrarOperacaoManual(op, registro())]);
    expect(resultados.filter(r => r.novo)).toHaveLength(1); expect(resultados[0].id).toBe(resultados[1].id);
    expect(await prisma.auditoria.count({ where: { acao: "integracao.registro_manual" } })).toBe(1);
    expect((await prisma.demanda.findUniqueOrThrow({ where: { id: demandaId } })).status).toBe("SIOPI_PENDENTE");
  }, 120000);
  it("rejeita escrita por perfil de consulta e configuração por operador", async () => {
    await expect(registrarOperacaoManual({ ...op, papel: "CONSULTA" }, registro())).rejects.toThrow(/permissão/);
    await expect(configurarOperacao({ ...op, papel: "OPERADOR" }, entradaConfig)).rejects.toThrow(/administrador/);
    expect(await prisma.execucaoExterna.count()).toBe(0); expect(await prisma.configuracaoOperacional.count()).toBe(0);
  }, 120000);
  it("desfaz o registro quando a auditoria falha", async () => {
    await expect(registrarOperacaoManual({ ...op, email: undefined as unknown as string }, registro())).rejects.toThrow();
    expect(await prisma.execucaoExterna.count()).toBe(0);
  }, 120000);
  it("exige contexto do BB e reconhece comprovante removido no histórico", async () => {
    await prisma.documento.update({ where: { id: documentoId }, data: { tipo: "BB_COMPROVANTE" } });
    const dados = { ...registro(), sistema: "BANCO_BRASIL" };
    await expect(registrarOperacaoManual(op, dados)).rejects.toThrow(/portal e a operação/);
    await configurarOperacao(op, { ...entradaConfig, sistema: "BANCO_BRASIL" });
    await registrarOperacaoManual(op, dados);
    await prisma.documento.update({ where: { id: documentoId }, data: { removidoEm: new Date() } });
    const painel = await painelOperacao(op, "BANCO_BRASIL");
    expect(painel.totalHistorico).toBe(1); expect(painel.documentosAtivos).toEqual([]);
  }, 120000);
  it("consulta dados SIOP exatos e recusa detalhes de outra empresa", async () => {
    await configurarSiop(op, { ambiente: "HOMOLOGACAO", usuario: "teste", perfil: 32, senhaEnvRef: "SIOP_TESTE_MD5", habilitada: false });
    const config = await prisma.siopCredencial.findUniqueOrThrow({ where: { empresaId_ambiente: { empresaId: op.empresa.id, ambiente: "HOMOLOGACAO" } } });
    const consulta = await prisma.siopConsulta.create({ data: { empresaId: op.empresa.id, credencialId: config.id, ambiente: "HOMOLOGACAO", anoExercicio: 2026, solicitadoPor: op.email, status: "CONCLUIDA" } });
    const retorno = await prisma.siopRetorno.create({ data: { empresaId: op.empresa.id, consultaId: consulta.id, sucesso: true, execucoesPresentes: true } });
    await prisma.siopExecucaoOrcamentariaPac.create({ data: { empresaId: op.empresa.id, retornoId: retorno.id, ordem: 0, pago: "99999999999999.99", localizador: "0032" } });
    const dados = await obterRetornoSiop(op, consulta.id);
    expect(dados.execucoes[0]).toEqual({ pago: "99999999999999.99", localizador: "0032" });
    expect((await listarConsultasSiop(outro, "HOMOLOGACAO")).total).toBe(0);
    await expect(obterRetornoSiop(outro, consulta.id)).rejects.toMatchObject({ codigo: "NAO_ENCONTRADO" });
    expect(await obterConfiguracaoSiop(op)).not.toHaveProperty("senha");
  }, 120000);
  it("pagina demandas, histórico e retornos SIOP sem perder ou repetir registros", async () => {
    await prisma.demanda.createMany({ data: Array.from({ length: 21 }, (_, i) => ({ empresaId: op.empresa.id, codigo: `ENG-${100 + i}`, status: "SIOPI_PENDENTE" as const, criadoPor: op.email })) });
    await prisma.execucaoExterna.createMany({ data: Array.from({ length: 21 }, (_, i) => ({ demandaId, sistema: "SIOPI" as const, modo: "REAL" as const, status: "CONCLUIDA" as const, protocolo: String(i), dados: { origem: "REGISTRO_MANUAL", documentoId } })) });
    const primeira = await painelOperacao(op, "SIOPI", "", 1, 1);
    const segunda = await painelOperacao(op, "SIOPI", "", 2, 2);
    expect(primeira.demandas).toHaveLength(20); expect(segunda.demandas).toHaveLength(2);
    expect(primeira.historico).toHaveLength(20); expect(segunda.historico).toHaveLength(1);
    expect(new Set([...primeira.historico, ...segunda.historico].map(x => x.id)).size).toBe(21);
    await configurarSiop(op, { ambiente: "HOMOLOGACAO", usuario: "teste", perfil: 32, senhaEnvRef: "SIOP_TESTE_MD5", habilitada: false });
    const credencial = await prisma.siopCredencial.findFirstOrThrow({ where: { empresaId: op.empresa.id } });
    await prisma.siopConsulta.createMany({ data: Array.from({ length: 51 }, (_, i) => ({ empresaId: op.empresa.id, credencialId: credencial.id, ambiente: "HOMOLOGACAO" as const, anoExercicio: 2000 + i, solicitadoPor: op.email })) });
    const c1 = await listarConsultasSiop(op, "HOMOLOGACAO", 1), c2 = await listarConsultasSiop(op, "HOMOLOGACAO", 2);
    expect(c1.consultas).toHaveLength(50); expect(c2.consultas).toHaveLength(1);
    expect(new Set([...c1.consultas, ...c2.consultas].map(x => x.id)).size).toBe(51);
    const retorno = await prisma.siopRetorno.create({ data: { empresaId: op.empresa.id, consultaId: c1.consultas[0].id, sucesso: true, execucoesPresentes: true } });
    await prisma.siopExecucaoOrcamentariaPac.createMany({ data: Array.from({ length: 101 }, (_, i) => ({ empresaId: op.empresa.id, retornoId: retorno.id, ordem: i, localizador: String(i).padStart(4, "0") })) });
    const r1 = await obterRetornoSiop(op, retorno.consultaId, 1), r2 = await obterRetornoSiop(op, retorno.consultaId, 2);
    expect(r1.execucoes).toHaveLength(100); expect(r2.execucoes).toEqual([{ localizador: "0100" }]);
  }, 120000);
  it("reserva o vínculo protegido SIOP ao dono e mantém os parâmetros permitidos ao administrador", async () => {
    const config = { usuario: "usuario-a", perfil: 32, senhaEnvRef: "SIOP_EMPRESA_A_MD5", habilitada: false };
    const admin = { ...op, dono: false };
    await expect(configurarSiop(admin, config)).rejects.toMatchObject({ codigo: "PROIBIDO" });
    await configurarSiop(op, config);
    await configurarSiop(admin, { ...config, usuario: "usuario-a-atualizado" });
    await expect(configurarSiop(admin, { ...config, senhaEnvRef: "SIOP_EMPRESA_B_MD5", habilitada: true })).rejects.toMatchObject({ codigo: "PROIBIDO" });
    expect((await obterConfiguracaoSiop(admin)).senhaEnvRef).toBe("SIOP_EMPRESA_A_MD5");
    expect((await obterConfiguracaoSiop(admin)).usuario).toBe("usuario-a-atualizado");
  }, 120000);
});
