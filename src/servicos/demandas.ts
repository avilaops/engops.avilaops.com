import type { Prioridade, Prisma, StatusDemanda, TipoServico } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auditar, emitirEvento } from "@/lib/auditoria";
import { EVENTOS } from "@/dominio/eventos";
import { formatarCodigo, podeTransitar, STATUS_ABERTOS, UFS } from "@/dominio/demandas";
import { revalidarDemanda } from "@/servicos/validacao";

const texto = (max: number) => z.string().trim().max(max).optional().or(z.literal("")).transform((v) => (v ? v : null));
const numero = z
  .union([z.string(), z.number()])
  .optional()
  .transform((v) => {
    if (v === undefined || v === "" || v === null) return null;
    const n = typeof v === "number" ? v : Number(String(v).replace(/\./g, "").replace(",", "."));
    return Number.isFinite(n) ? n : null;
  });
const dataOpcional = z.string().optional().transform((v) => (v ? new Date(v) : null));

export const esquemaDemanda = z.object({
  numeroOs: texto(60),
  tipoServico: z.enum(["AVALIACAO_IMOVEL", "ACOMPANHAMENTO_OBRA", "VISTORIA", "LAUDO_TECNICO", "OUTRO"]).default("AVALIACAO_IMOVEL"),
  prioridade: z.enum(["BAIXA", "NORMAL", "ALTA", "URGENTE"]).default("NORMAL"),
  clienteId: texto(40),
  responsavelId: texto(40),
  prazo: dataOpcional,
  observacoes: texto(4000),
  endereco: texto(200),
  numero: texto(20),
  complemento: texto(100),
  bairro: texto(100),
  municipio: texto(100),
  uf: z.enum(UFS).optional().or(z.literal("")).transform((v) => (v ? v : null)),
  cep: texto(9),
  matricula: texto(40),
  cartorio: texto(120),
  areaM2: numero,
  tipoImovel: texto(60),
  proprietarioNome: texto(160),
  proprietarioDoc: texto(20),
  valorAvaliacao: numero,
  dataVistoria: dataOpcional,
});

export type DadosDemanda = z.infer<typeof esquemaDemanda>;

export async function criarDemanda(empresaId: string, usuario: string, dados: DadosDemanda) {
  const demanda = await prisma.$transaction(async (tx) => {
    const empresa = await tx.empresa.update({ where: { id: empresaId }, data: { proximoCodigo: { increment: 1 } } });
    const codigo = formatarCodigo(empresa.proximoCodigo - 1);
    const d = await tx.demanda.create({
      data: { ...dados, empresaId, codigo, criadoPor: usuario, status: "NOVA" },
    });
    await auditar({ empresaId, usuario, acao: "demanda.criada", objetoTipo: "Demanda", objetoId: d.id, depois: { codigo, numeroOs: d.numeroOs } }, tx);
    await emitirEvento(empresaId, EVENTOS.DemandaCriada, { demandaId: d.id, codigo, numeroOs: d.numeroOs, tipoServico: d.tipoServico, prazo: d.prazo }, tx);
    return d;
  });
  await revalidarDemanda(demanda.id);
  return demanda;
}

export async function atualizarDemanda(id: string, empresaId: string, usuario: string, dados: Partial<DadosDemanda>) {
  const antes = await prisma.demanda.findFirst({ where: { id, empresaId } });
  if (!antes) throw new Error("Demanda não encontrada");
  const depois = await prisma.$transaction(async (tx) => {
    const d = await tx.demanda.update({ where: { id }, data: dados });
    const mudou: Record<string, [unknown, unknown]> = {};
    for (const k of Object.keys(dados) as (keyof DadosDemanda)[]) {
      const a = antes[k as keyof typeof antes];
      const b = d[k as keyof typeof d];
      if (String(a ?? "") !== String(b ?? "")) mudou[k] = [a, b];
    }
    if (Object.keys(mudou).length) {
      await auditar({ empresaId, usuario, acao: "demanda.alterada", objetoTipo: "Demanda", objetoId: id, antes: Object.fromEntries(Object.entries(mudou).map(([k, v]) => [k, v[0]])), depois: Object.fromEntries(Object.entries(mudou).map(([k, v]) => [k, v[1]])) }, tx);
      if (mudou.responsavelId) await emitirEvento(empresaId, EVENTOS.DemandaAtribuida, { demandaId: id, responsavelId: dados.responsavelId }, tx);
    }
    return d;
  });
  await revalidarDemanda(id);
  return depois;
}

/**
 * Muda o estado. Pessoa só anda pelas transições permitidas; o motor de
 * automação passa `origem: "automacao"` e pode saltar (uma demanda NOVA cujo
 * SIMIL foi preparado vai direto a SIMIL_PENDENTE: o motor sabe o que fez).
 */
export async function mudarStatus(id: string, empresaId: string, para: StatusDemanda, usuario: string, origem = "ui") {
  const d = await prisma.demanda.findFirst({ where: { id, empresaId } });
  if (!d) throw new Error("Demanda não encontrada");
  if (d.status === para) return d;
  if (origem !== "automacao" && !podeTransitar(d.status, para)) throw new Error(`Não dá para ir de ${d.status} para ${para}`);
  const atualizado = await prisma.$transaction(async (tx) => {
    const x = await tx.demanda.update({
      where: { id },
      data: {
        status: para,
        entregueEm: para === "ENTREGUE" ? new Date() : d.entregueEm,
        arquivadaEm: para === "ARQUIVADA" ? new Date() : para === "NOVA" ? null : d.arquivadaEm,
      },
    });
    await auditar({ empresaId, usuario, acao: "demanda.status", objetoTipo: "Demanda", objetoId: id, antes: { status: d.status }, depois: { status: para }, origem }, tx);
    await emitirEvento(empresaId, EVENTOS.DemandaStatusAlterado, { demandaId: id, codigo: d.codigo, de: d.status, para }, tx);
    if (para === "ENTREGUE") await emitirEvento(empresaId, EVENTOS.DemandaEntregue, { demandaId: id, codigo: d.codigo }, tx);
    if (para === "PRONTA_PARA_PROCESSAMENTO") await emitirEvento(empresaId, EVENTOS.DemandaPronta, { demandaId: id, codigo: d.codigo }, tx);
    return x;
  });
  return atualizado;
}

export type FiltrosDemanda = {
  busca?: string;
  status?: StatusDemanda[];
  responsavelId?: string;
  prioridade?: Prioridade;
  tipoServico?: TipoServico;
  prazo?: "hoje" | "amanha" | "semana" | "atrasadas" | "risco";
  abertas?: boolean;
};

export function whereDeFiltros(empresaId: string, f: FiltrosDemanda): Prisma.DemandaWhereInput {
  const where: Prisma.DemandaWhereInput = { empresaId };
  if (f.status?.length) where.status = { in: f.status };
  else if (f.abertas !== false) where.status = { in: STATUS_ABERTOS };
  if (f.responsavelId) where.responsavelId = f.responsavelId;
  if (f.prioridade) where.prioridade = f.prioridade;
  if (f.tipoServico) where.tipoServico = f.tipoServico;
  if (f.busca) {
    const b = f.busca.trim();
    const soDigitos = b.replace(/\D/g, "");
    where.OR = [
      { codigo: { contains: b, mode: "insensitive" } },
      { numeroOs: { contains: b, mode: "insensitive" } },
      { proprietarioNome: { contains: b, mode: "insensitive" } },
      { endereco: { contains: b, mode: "insensitive" } },
      { municipio: { contains: b, mode: "insensitive" } },
      { matricula: { contains: b, mode: "insensitive" } },
      { cliente: { nome: { contains: b, mode: "insensitive" } } },
      { responsavel: { nome: { contains: b, mode: "insensitive" } } },
      ...(soDigitos.length >= 5 ? [{ proprietarioDoc: { contains: soDigitos } }] : []),
    ];
  }
  if (f.prazo) {
    const agora = new Date();
    const inicioHoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
    const dia = 86_400_000;
    const faixas = {
      hoje: { gte: inicioHoje, lt: new Date(inicioHoje.getTime() + dia) },
      amanha: { gte: new Date(inicioHoje.getTime() + dia), lt: new Date(inicioHoje.getTime() + 2 * dia) },
      semana: { gte: inicioHoje, lt: new Date(inicioHoje.getTime() + 7 * dia) },
      atrasadas: { lt: inicioHoje },
      risco: { gte: inicioHoje, lt: new Date(inicioHoje.getTime() + 3 * dia) },
    };
    where.prazo = faixas[f.prazo];
    if (!f.status?.length) where.status = { in: STATUS_ABERTOS };
  }
  return where;
}

export const INCLUDE_LISTA = {
  cliente: { select: { id: true, nome: true } },
  responsavel: { select: { id: true, nome: true } },
  _count: { select: { documentos: { where: { removidoEm: null } }, pendencias: { where: { resolvidaEm: null } } } },
} satisfies Prisma.DemandaInclude;

export async function listarDemandas(empresaId: string, f: FiltrosDemanda, take = 200) {
  return prisma.demanda.findMany({
    where: whereDeFiltros(empresaId, f),
    include: INCLUDE_LISTA,
    orderBy: [{ prazo: { sort: "asc", nulls: "last" } }, { criadoEm: "desc" }],
    take,
  });
}

export async function obterDemanda(id: string, empresaId: string) {
  return prisma.demanda.findFirst({
    where: { id, empresaId },
    include: {
      cliente: true,
      responsavel: true,
      documentos: { where: { removidoEm: null }, orderBy: [{ categoria: "asc" }, { criadoEm: "desc" }] },
      checklist: { orderBy: { ordem: "asc" } },
      pendencias: { where: { resolvidaEm: null }, orderBy: [{ severidade: "asc" }, { criadoEm: "asc" }] },
      execucoes: { orderBy: { iniciadoEm: "desc" } },
      aprovacoes: { orderBy: { solicitadaEm: "desc" } },
      jobs: { orderBy: { criadoEm: "desc" }, take: 20, include: { eventos: { orderBy: { criadoEm: "asc" } } } },
    },
  });
}

export type DemandaCompleta = NonNullable<Awaited<ReturnType<typeof obterDemanda>>>;

export async function resolverPendencia(id: string, empresaId: string, usuario: string) {
  const p = await prisma.pendencia.findFirst({ where: { id, empresaId, resolvidaEm: null } });
  if (!p) throw new Error("Pendência não encontrada");
  await prisma.pendencia.update({ where: { id }, data: { resolvidaEm: new Date(), resolvidaPor: usuario } });
  await auditar({ empresaId, usuario, acao: "pendencia.resolvida", objetoTipo: "Pendencia", objetoId: id, antes: { codigo: p.codigo, titulo: p.titulo } });
  await revalidarDemanda(p.demandaId);
}

export async function abrirPendenciaManual(demandaId: string, empresaId: string, usuario: string, titulo: string, severidade: "BLOQUEIA" | "AVISO") {
  const d = await prisma.demanda.findFirst({ where: { id: demandaId, empresaId } });
  if (!d) throw new Error("Demanda não encontrada");
  const p = await prisma.pendencia.create({ data: { empresaId, demandaId, codigo: "MANUAL", severidade, titulo, origem: "MANUAL" } });
  await auditar({ empresaId, usuario, acao: "pendencia.aberta", objetoTipo: "Pendencia", objetoId: p.id, depois: { titulo, severidade } });
  await revalidarDemanda(demandaId);
  return p;
}
