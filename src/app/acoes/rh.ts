"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exigirOperador } from "@/lib/tenant";
import { cadastroNomeSchema, funcionarioSchema } from "@/dominio/rh";
import { podeAlterarPessoas } from "@/dominio/modulos";
import { exigirModulo } from "@/servicos/modulos";

async function contextoRh() {
  const op = await exigirOperador();
  await exigirModulo(op.empresa.id, "RH");
  if (!podeAlterarPessoas(op.papel)) throw new Error("Sem permissão para alterar dados de RH.");
  return op;
}

export async function criarSetorAction(form: FormData): Promise<void> {
  const op = await contextoRh();
  const dados = cadastroNomeSchema.parse(Object.fromEntries(form));
  await prisma.setorRh.create({ data: { empresaId: op.empresa.id, ...dados } });
  revalidatePath("/rh");
}

export async function criarCargoAction(form: FormData): Promise<void> {
  const op = await contextoRh();
  const dados = cadastroNomeSchema.parse(Object.fromEntries(form));
  await prisma.cargoRh.create({ data: { empresaId: op.empresa.id, ...dados, cbo: String(form.get("cbo") ?? "") || null } });
  revalidatePath("/rh");
}

export async function criarFuncionarioAction(form: FormData): Promise<void> {
  const op = await contextoRh();
  const dados = funcionarioSchema.parse(Object.fromEntries(form));
  const [setor, cargo] = await Promise.all([
    prisma.setorRh.findFirst({ where: { id: dados.setorId, empresaId: op.empresa.id } }),
    prisma.cargoRh.findFirst({ where: { id: dados.cargoId, empresaId: op.empresa.id } }),
  ]);
  if (!setor || !cargo) throw new Error("Setor ou cargo não pertence a esta empresa.");
  await prisma.funcionarioRh.create({ data: { ...dados, email: dados.email || null, matricula: dados.matricula || null, empresaId: op.empresa.id } });
  revalidatePath("/rh");
}
