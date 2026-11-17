"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exigirOperador } from "@/lib/tenant";
import { exigirModulo } from "@/servicos/modulos";
import { podeAlterarPessoas } from "@/dominio/modulos";
import { compromissoAgendaSchema } from "@/dominio/agenda";
import { auditar } from "@/lib/auditoria";

export async function criarCompromissoAction(form: FormData): Promise<void> {
  const op = await exigirOperador(); await exigirModulo(op.empresa.id, "RH");
  if (!podeAlterarPessoas(op.papel)) throw new Error("Sem permissão para alterar a agenda.");
  const dados = compromissoAgendaSchema.parse(Object.fromEntries(form));
  if (!await prisma.cliente.findFirst({ where: { id: dados.clienteId, empresaId: op.empresa.id } })) throw new Error("Empresa cliente não pertence à GRB.");
  await prisma.$transaction(async tx => { const compromisso = await tx.compromissoAgenda.create({ data: { ...dados, empresaId: op.empresa.id, criadoPor: op.email } }); await auditar({ empresaId: op.empresa.id, usuario: op.email, acao: "agenda.compromisso_criado", objetoTipo: "CompromissoAgenda", objetoId: compromisso.id, depois: compromisso, metadados: { clienteId: dados.clienteId } }, tx); });
  revalidatePath("/agenda");
}
