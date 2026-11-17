"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auditar } from "@/lib/auditoria";
import { exigirOperador } from "@/lib/tenant";
import { pode } from "@/lib/rbac";
import type { EstadoAcao } from "@/app/acoes/demandas";
import { consultarCnpj, type DadosCnpj } from "@/servicos/cnpjws";
import { validarCpfCnpj } from "@/dominio/validacao";
import type { Prisma } from "@prisma/client";

export async function consultarCnpjAction(documento: string): Promise<{ dados?: DadosCnpj; erro?: string }> {
  const op = await exigirOperador();
  if (!pode(op.papel, "demanda.criar")) return { erro: "Sem permissão para consultar contratantes." };
  if (typeof documento !== "string" || documento.length > 20) return { erro: "Documento inválido." };
  try { return { dados: await consultarCnpj(documento) }; }
  catch (e) { return { erro: e instanceof Error ? e.message : "Falha na consulta." }; }
}

const esquema = z.object({
  nome: z.string().trim().min(2).max(160),
  documento: z.string().trim().max(20).transform((v) => v.replace(/\D/g, "")).refine((v) => validarCpfCnpj(v), "CPF/CNPJ inválido"),
  email: z.string().trim().email().optional().or(z.literal("")).transform((v) => v || null),
  telefone: z.string().trim().max(30).optional().or(z.literal("")).transform((v) => v || null),
});

export async function criarClienteAction(_: EstadoAcao, form: FormData): Promise<EstadoAcao & { cliente?: { id: string; nome: string } }> {
  const op = await exigirOperador();
  if (!pode(op.papel, "demanda.criar")) return { erro: "Sem permissão." };
  try {
    const dados = esquema.parse({ nome: form.get("nome"), documento: form.get("documento"), email: form.get("email"), telefone: form.get("telefone") });
    const importado = form.get("importarCnpj");
    const dadosCnpj = importado === dados.documento ? await consultarCnpj(dados.documento) : undefined;
    const c = await prisma.$transaction(async (tx) => {
      const criado = await tx.cliente.create({ data: { ...dados, empresaId: op.empresa.id, dadosCnpj: dadosCnpj ? JSON.parse(JSON.stringify(dadosCnpj)) as Prisma.InputJsonValue : undefined } });
      await auditar({ empresaId: op.empresa.id, usuario: op.email, acao: "cliente.criado", objetoTipo: "Cliente", objetoId: criado.id, depois: dados, metadados: { fonte: dadosCnpj ? "CNPJ.ws" : "manual" } }, tx);
      return criado;
    });
    revalidatePath("/clientes");
    return { ok: `${c.nome} cadastrado.`, cliente: { id: c.id, nome: c.nome } };
  } catch (e) {
    if (e instanceof z.ZodError) return { erro: e.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("\n") };
    return { erro: e instanceof Error ? e.message : "Falhou" };
  }
}
