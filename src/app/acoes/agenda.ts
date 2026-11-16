"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { exigirOperador } from "@/lib/tenant";
import { exigirModulo } from "@/servicos/modulos";
import { podeAlterarPessoas } from "@/dominio/modulos";

export async function criarCompromissoAction(form: FormData): Promise<void> {
  const op = await exigirOperador(); await exigirModulo(op.empresa.id, "RH");
  if (!podeAlterarPessoas(op.papel)) throw new Error("Sem permissão para alterar a agenda.");
  const dados = z.object({ titulo: z.string().trim().min(2), inicio: z.coerce.date(), descricao: z.string().trim().optional() }).parse(Object.fromEntries(form));
  await prisma.compromissoAgenda.create({ data: { ...dados, empresaId: op.empresa.id, criadoPor: op.email } });
  revalidatePath("/agenda");
}
