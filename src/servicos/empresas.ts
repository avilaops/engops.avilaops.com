import type { PapelMembro } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auditar } from "@/lib/auditoria";

export function slugDe(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
}

export const esquemaEmpresa = z.object({
  nome: z.string().trim().min(2).max(120),
  cnpj: z.string().trim().max(20).optional().or(z.literal("")).transform((v) => v || null),
  slug: z.string().trim().max(40).optional().or(z.literal("")).transform((v) => v || undefined),
});

export async function criarEmpresa(usuario: string, dados: z.infer<typeof esquemaEmpresa>, primeiroMembro?: { email: string; nome: string }) {
  let slug = dados.slug ?? slugDe(dados.nome);
  if (!slug) slug = `empresa-${Date.now().toString(36)}`;
  let tentativa = slug;
  for (let i = 2; await prisma.empresa.findUnique({ where: { slug: tentativa } }); i++) tentativa = `${slug}-${i}`;

  return prisma.$transaction(async (tx) => {
    const e = await tx.empresa.create({ data: { nome: dados.nome, cnpj: dados.cnpj, slug: tentativa } });
    if (primeiroMembro) {
      await tx.membro.create({ data: { empresaId: e.id, email: primeiroMembro.email.toLowerCase(), nome: primeiroMembro.nome, papel: "ADMIN" } });
    }
    await auditar({ empresaId: e.id, usuario, acao: "empresa.criada", objetoTipo: "Empresa", objetoId: e.id, depois: { nome: e.nome, slug: e.slug } }, tx);
    return e;
  });
}

export const esquemaMembro = z.object({
  email: z.string().trim().toLowerCase().email(),
  nome: z.string().trim().min(2).max(120),
  papel: z.enum(["ADMIN", "GESTOR", "OPERADOR", "REVISOR", "CONSULTA"]),
});

export async function salvarMembro(empresaId: string, usuario: string, dados: z.infer<typeof esquemaMembro>) {
  const m = await prisma.membro.upsert({
    where: { empresaId_email: { empresaId, email: dados.email } },
    create: { empresaId, ...dados },
    update: { nome: dados.nome, papel: dados.papel, ativo: true },
  });
  await auditar({ empresaId, usuario, acao: "membro.salvo", objetoTipo: "Membro", objetoId: m.id, depois: dados });
  return m;
}

export async function desligarMembro(empresaId: string, usuario: string, id: string) {
  const m = await prisma.membro.findFirst({ where: { id, empresaId } });
  if (!m) throw new Error("Membro não encontrado");
  if (m.email === usuario) throw new Error("Você não pode desligar o próprio acesso");
  await prisma.membro.update({ where: { id }, data: { ativo: false } });
  await auditar({ empresaId, usuario, acao: "membro.desligado", objetoTipo: "Membro", objetoId: id, antes: { email: m.email, papel: m.papel } });
}

export async function mudarModoAutomacao(empresaId: string, usuario: string, modo: "SOMBRA" | "REAL") {
  const e = await prisma.empresa.findUnique({ where: { id: empresaId } });
  if (!e) throw new Error("Empresa não encontrada");
  await prisma.empresa.update({ where: { id: empresaId }, data: { modoAutomacao: modo } });
  await auditar({ empresaId, usuario, acao: "empresa.modoAutomacao", objetoTipo: "Empresa", objetoId: empresaId, antes: { modo: e.modoAutomacao }, depois: { modo } });
}

export type { PapelMembro };
