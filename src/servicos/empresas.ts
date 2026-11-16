import { Prisma, type PapelMembro } from "@prisma/client";
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

export async function criarEmpresa(
  usuario: string,
  dados: z.infer<typeof esquemaEmpresa>,
  primeiroMembro?: { email: string; nome: string },
  opcoes: { somenteSemVinculo?: boolean } = {},
) {
  const base = dados.slug ?? (slugDe(dados.nome) || `empresa-${Date.now().toString(36)}`);

  for (let tentativa = 1; tentativa <= 100; tentativa++) {
    const sufixo = tentativa === 1 ? "" : `-${tentativa}`;
    const slug = `${base.slice(0, 40 - sufixo.length)}${sufixo}`;
    try {
      return await prisma.$transaction(async (tx) => {
        if (opcoes.somenteSemVinculo && primeiroMembro) {
          const vinculo = await tx.membro.findFirst({
            where: { email: primeiroMembro.email.toLowerCase(), ativo: true, empresa: { ativo: true } },
            select: { id: true },
          });
          if (vinculo) throw new Error("Sua conta já está vinculada a uma empresa.");
        }

        const e = await tx.empresa.create({ data: { nome: dados.nome, cnpj: dados.cnpj, slug } });
        if (primeiroMembro) {
          await tx.membro.create({ data: { empresaId: e.id, email: primeiroMembro.email.toLowerCase(), nome: primeiroMembro.nome, papel: "ADMIN" } });
        }
        await auditar({ empresaId: e.id, usuario, acao: "empresa.criada", objetoTipo: "Empresa", objetoId: e.id, depois: { nome: e.nome, slug: e.slug } }, tx);
        return e;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (erro) {
      if (erro instanceof Prisma.PrismaClientKnownRequestError) {
        const alvo = erro.meta?.target;
        const slugDuplicado = erro.code === "P2002" && (Array.isArray(alvo) ? alvo.includes("slug") : typeof alvo === "string" && alvo.includes("slug"));
        if (slugDuplicado || (opcoes.somenteSemVinculo && erro.code === "P2034")) continue;
      }
      throw erro;
    }
  }

  throw new Error("Não foi possível reservar um identificador para a empresa. Tente novamente.");
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
