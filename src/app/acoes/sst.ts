"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { exigirOperador } from "@/lib/tenant";
import { exigirModulo } from "@/servicos/modulos";
import { podeAlterarPessoas } from "@/dominio/modulos";
import { treinamentoSchema } from "@/dominio/sst";

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
