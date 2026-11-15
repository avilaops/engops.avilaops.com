import { createHash } from "node:crypto";
import { Prisma, type GovRegistro } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { pode } from "@/lib/rbac";
import type { Operador } from "@/lib/tenant";
import { esquemaBuscaGlobal } from "@/dominio/gov-catalogo";
import { whereGov } from "@/servicos/gov-busca";
import { z } from "zod";

type Tx = Prisma.TransactionClient;
const ehDono = (email: string) => (process.env.ENGOPS_DONOS ?? "nicolas@avilaops.com").toLowerCase().split(",").map(v => v.trim()).includes(email.toLowerCase());
async function podeReceber(tx: Tx, empresaId: string, email: string) {
  return ehDono(email) || Boolean(await tx.membro.findFirst({ where: { empresaId, email, ativo: true, empresa: { ativo: true } }, select: { id: true } }));
}
async function avisar(tx: Tx, v: { empresaId: string; email: string; registroId: string; tipo: string; versao: string; titulo: string; corpo: string; link: string }) {
  if (!await podeReceber(tx, v.empresaId, v.email)) return;
  const id = createHash("sha256").update([v.empresaId, v.email, v.registroId, v.tipo, v.versao].join("\n")).digest("hex");
  const inserido = await tx.govAviso.createMany({ data: [{ id, empresaId: v.empresaId, email: v.email, registroId: v.registroId, tipo: v.tipo }], skipDuplicates: true });
  if (inserido.count) await tx.notificacao.create({ data: { empresaId: v.empresaId, destinatario: v.email, titulo: v.titulo, corpo: v.corpo.slice(0, 1000), link: v.link } });
}

export async function reconciliarSalvosGov(tx: Tx, registro: GovRegistro, alterado: boolean) {
  const salvas = await tx.oportunidadeGovSalva.findMany({ where: { OR: [
    { registroId: registro.id },
    { registroId: null, externoId: registro.externoId, ...(registro.tipo === "PREGAO" ? { fonte: "COMPRAS" } : {}) },
  ] } });
  for (const s of salvas) {
    // Notas e decisão da empresa nunca são sobrescritas pela fonte.
    await tx.oportunidadeGovSalva.update({ where: { id: s.id }, data: { registroId: registro.id, dados: registro.dados as Prisma.InputJsonValue, revisaoVista: registro.revisao, proximaConferenciaEm: new Date(Date.now() + 6 * 3600000), erroConferencia: null } });
    if (alterado && s.revisaoVista < registro.revisao) await avisar(tx, {
      empresaId: s.empresaId, email: s.salvoPor, registroId: registro.id, tipo: "ALTERACAO", versao: String(registro.revisao),
      titulo: "Uma oportunidade salva foi atualizada", corpo: registro.objeto, link: "/gov?visao=salvas",
    });
  }
}

export async function avisarNovasGov(tx: Tx, registro: GovRegistro) {
  if (!registro.publicado) return;
  const regras = await tx.govRegraAlerta.findMany({ where: { ativa: true, criadoEm: { lte: registro.publicado } } });
  for (const regra of regras) {
    const filtros = esquemaBuscaGlobal.safeParse(regra.filtros);
    if (!filtros.success) continue;
    const combina = await tx.$queryRaw<{ id: string }[]>(Prisma.sql`SELECT id FROM gov_registros ${whereGov(filtros.data)} AND id = ${registro.id} LIMIT 1`);
    if (combina.length) await avisar(tx, { empresaId: regra.empresaId, email: regra.email, registroId: registro.id, tipo: `NOVA:${regra.id}`, versao: "1", titulo: `Nova oportunidade • ${regra.nome}`, corpo: registro.objeto, link: "/gov" });
  }
}

export async function alertarPrazosGov(agora = new Date()) {
  const salvas = await prisma.oportunidadeGovSalva.findMany({ where: { situacao: { not: "DESCARTADA" }, registro: { tipo: { not: "PLANEJAMENTO" }, prazo: { gte: agora, lte: new Date(agora.getTime() + 48 * 3600000) } } }, include: { registro: true } });
  for (const s of salvas) if (s.registro?.prazo && !/(revogad|anulad|cancelad|suspens)/i.test(String((s.registro.dados as { situacao?: string }).situacao ?? ""))) await prisma.$transaction(tx => avisar(tx, { empresaId: s.empresaId, email: s.salvoPor, registroId: s.registro!.id, tipo: "PRAZO", versao: s.registro!.prazo!.toISOString(), titulo: "Prazo de oportunidade salva em até 48 horas", corpo: s.registro!.objeto, link: "/gov?visao=salvas" }));
  return salvas.length;
}

export async function criarRegraGov(op: Operador, nome: unknown, entrada: unknown) {
  if (!pode(op.papel, "demanda.editar")) throw new Error("Sem permissão para criar alertas.");
  const titulo = z.string().trim().min(2).max(120).parse(nome);
  const filtros = esquemaBuscaGlobal.parse(entrada);
  if (await prisma.govRegraAlerta.count({ where: { empresaId: op.empresa.id, email: op.email, ativa: true } }) >= 20) throw new Error("Limite de 20 alertas ativos por pessoa nesta empresa.");
  return prisma.govRegraAlerta.create({ data: { empresaId: op.empresa.id, email: op.email, nome: titulo, filtros } });
}
export async function desativarRegraGov(op: Operador, id: string) {
  if (!pode(op.papel, "demanda.editar")) throw new Error("Sem permissão.");
  return prisma.govRegraAlerta.updateMany({ where: { id, empresaId: op.empresa.id, email: op.email }, data: { ativa: false } });
}
export function listarRegrasGov(op: Operador) {
  return prisma.govRegraAlerta.findMany({ where: { empresaId: op.empresa.id, email: op.email, ativa: true }, orderBy: { criadoEm: "desc" } });
}
