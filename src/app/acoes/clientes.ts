"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auditar } from "@/lib/auditoria";
import { exigirOperador } from "@/lib/tenant";
import { pode } from "@/lib/rbac";
import type { EstadoAcao } from "@/app/acoes/demandas";

const esquema = z.object({
  nome: z.string().trim().min(2).max(160),
  documento: z.string().trim().max(20).optional().or(z.literal("")).transform((v) => v || null),
  email: z.string().trim().email().optional().or(z.literal("")).transform((v) => v || null),
  telefone: z.string().trim().max(30).optional().or(z.literal("")).transform((v) => v || null),
});

export async function criarClienteAction(_: EstadoAcao, form: FormData): Promise<EstadoAcao> {
  const op = await exigirOperador();
  if (!pode(op.papel, "demanda.criar")) return { erro: "Sem permissão." };
  try {
    const dados = esquema.parse({ nome: form.get("nome"), documento: form.get("documento"), email: form.get("email"), telefone: form.get("telefone") });
    const c = await prisma.cliente.create({ data: { ...dados, empresaId: op.empresa.id } });
    await auditar({ empresaId: op.empresa.id, usuario: op.email, acao: "cliente.criado", objetoTipo: "Cliente", objetoId: c.id, depois: dados });
    revalidatePath("/clientes");
    return { ok: `${c.nome} cadastrado.` };
  } catch (e) {
    if (e instanceof z.ZodError) return { erro: e.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("\n") };
    return { erro: e instanceof Error ? e.message : "Falhou" };
  }
}
