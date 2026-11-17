"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { exigirOperador } from "@/lib/tenant";
import { exigirModulo } from "@/servicos/modulos";
import { podeAlterarPessoas } from "@/dominio/modulos";
import { treinamentoSchema } from "@/dominio/sst";
import { calcularVencimento, ordemServicoSchema } from "@/dominio/sst";
import { auditar } from "@/lib/auditoria";
import { normaPodeEmitirCertificado } from "@/servicos/documentos-sst";

async function contextoSst() { const op = await exigirOperador(); await exigirModulo(op.empresa.id, "SST"); if (!podeAlterarPessoas(op.papel)) throw new Error("Sem permissão para alterar dados de SST."); return op; }

export async function criarNormaAction(form: FormData): Promise<void> {
  const op = await contextoSst();
  const dados = z.object({ codigo: z.string().trim().min(2), titulo: z.string().trim().min(2) }).parse(Object.fromEntries(form));
  await prisma.normaSst.create({ data: { ...dados, empresaId: op.empresa.id } });
  revalidatePath("/sst");
}

export async function criarTreinamentoAction(form: FormData): Promise<void> {
  const op = await contextoSst();
  const dados = treinamentoSchema.parse(Object.fromEntries(form));
  if (dados.normaId && !await prisma.normaSst.findFirst({ where: { id: dados.normaId, empresaId: op.empresa.id } })) throw new Error("Norma não pertence a esta empresa.");
  await prisma.treinamentoSst.create({ data: { ...dados, normaId: dados.normaId || null, empresaId: op.empresa.id } });
  revalidatePath("/sst"); revalidatePath("/agenda");
}

export async function adicionarParticipanteAction(form: FormData): Promise<void> {
  const op = await contextoSst();
  const treinamentoId = String(form.get("treinamentoId")); const funcionarioId = String(form.get("funcionarioId"));
  const [treinamento, funcionario] = await Promise.all([prisma.treinamentoSst.findFirst({ where: { id: treinamentoId, empresaId: op.empresa.id } }), prisma.funcionarioRh.findFirst({ where: { id: funcionarioId, empresaId: op.empresa.id } })]);
  if (!treinamento || !funcionario) throw new Error("Treinamento e funcionário devem pertencer à mesma empresa.");
  await prisma.participanteTreinamentoSst.create({ data: { empresaId: op.empresa.id, treinamentoId, funcionarioId } });
  revalidatePath("/sst");
}

export async function atualizarParticipanteAction(form: FormData): Promise<void> {
  const op = await contextoSst(); const id = String(form.get("participanteId"));
  const atual = await prisma.participanteTreinamentoSst.findFirst({ where: { id, empresaId: op.empresa.id } });
  if (!atual) throw new Error("Participante não encontrado nesta empresa.");
  const dados = { presente: form.get("presente") === "on", aprovado: form.get("aprovado") === "on" };
  await prisma.$transaction(async tx => { await tx.participanteTreinamentoSst.update({ where: { id }, data: dados }); await auditar({ empresaId: op.empresa.id, usuario: op.email, acao: "sst.participante_atualizado", objetoTipo: "ParticipanteTreinamentoSst", objetoId: id, antes: atual, depois: dados }, tx); });
  revalidatePath("/sst");
}

export async function emitirCertificadoAction(form: FormData): Promise<void> {
  const op = await contextoSst(); const participanteId = String(form.get("participanteId"));
  const participante = await prisma.participanteTreinamentoSst.findFirst({ where: { id: participanteId, empresaId: op.empresa.id }, include: { treinamento: { include: { norma: true } }, funcionario: true } });
  if (!participante || !participante.presente || !participante.aprovado) throw new Error("O certificado exige participante presente e aprovado.");
  if (participante.treinamento.norma && !normaPodeEmitirCertificado(participante.treinamento.norma.codigo)) throw new Error("Esta norma está revogada e não permite emissão de certificado.");
  const emitidoEm = new Date(); const venceEm = participante.treinamento.validadeMeses ? calcularVencimento(participante.treinamento.inicio, participante.treinamento.validadeMeses) : null;
  const numero = `CERT-${emitidoEm.getUTCFullYear()}-${participante.id.slice(-8).toUpperCase()}`;
  await prisma.$transaction(async tx => { const certificado = await tx.certificadoSst.upsert({ where: { participanteId }, create: { empresaId: op.empresa.id, participanteId, numero, emitidoEm, venceEm, arquivoChave: `/api/sst/certificados/${participanteId}/pdf` }, update: { emitidoEm, venceEm } }); await auditar({ empresaId: op.empresa.id, usuario: op.email, acao: "sst.certificado_emitido", objetoTipo: "CertificadoSst", objetoId: certificado.id, depois: { numero, participanteId, venceEm } }, tx); });
  revalidatePath("/sst"); revalidatePath("/agenda");
}

export async function criarOrdemServicoAction(form: FormData): Promise<void> {
  const op = await contextoSst(); const dados = ordemServicoSchema.parse(Object.fromEntries(form));
  if (!await prisma.funcionarioRh.findFirst({ where: { id: dados.funcionarioId, empresaId: op.empresa.id } })) throw new Error("Funcionário não pertence a esta empresa.");
  await prisma.$transaction(async tx => { const ordem = await tx.ordemServicoSst.create({ data: { ...dados, epis: dados.epis || null, empresaId: op.empresa.id } }); await auditar({ empresaId: op.empresa.id, usuario: op.email, acao: "sst.ordem_criada", objetoTipo: "OrdemServicoSst", objetoId: ordem.id, depois: dados }, tx); });
  revalidatePath("/sst");
}
