import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { PapelMembro } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { lerSessaoSSO, urlLoginSSO, type SessaoSSO } from "@/lib/sessao";

/**
 * Quem está operando, em qual empresa, com qual papel.
 *
 * O SSO identifica a pessoa. Aqui a pessoa vira MEMBRO de uma empresa, com
 * papel, e é esse par (empresa, papel) que toda tela e toda rota usam. Dono da
 * plataforma (`ENGOPS_DONOS`) entra em qualquer empresa como ADMIN; é o que
 * permite criar a primeira empresa e dar suporte.
 */

const COOKIE_EMPRESA = "engops_empresa";

export type Operador = {
  sessao: SessaoSSO;
  email: string;
  nome: string;
  /** Dono da plataforma: vê todas as empresas. */
  dono: boolean;
  empresa: { id: string; slug: string; nome: string; modoAutomacao: "SOMBRA" | "REAL" };
  membroId: string | null;
  papel: PapelMembro;
};

export function ehDonoDaPlataforma(email: string): boolean {
  const lista = (process.env.ENGOPS_DONOS ?? "nicolas@avilaops.com")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return lista.includes(email.toLowerCase());
}

/** Empresas que esta pessoa pode abrir. */
export async function empresasDoUsuario(email: string) {
  if (ehDonoDaPlataforma(email)) {
    return prisma.empresa.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } });
  }
  const membros = await prisma.membro.findMany({
    where: { email: email.toLowerCase(), ativo: true, empresa: { ativo: true } },
    include: { empresa: true },
    orderBy: { empresa: { nome: "asc" } },
  });
  return membros.map((m) => m.empresa);
}

/**
 * Sessão obrigatória. Sem SSO manda para o login; com SSO mas sem empresa
 * manda para a escolha (ou para o cadastro, se for o dono e não houver nenhuma).
 */
export async function exigirOperador(): Promise<Operador> {
  const sessao = await lerSessaoSSO();
  if (!sessao) redirect(urlLoginSSO());

  const email = sessao.email.toLowerCase();
  const dono = ehDonoDaPlataforma(email);
  const empresaId = (await cookies()).get(COOKIE_EMPRESA)?.value ?? null;

  const membro = empresaId
    ? await prisma.membro.findFirst({
        where: { email, empresaId, ativo: true, empresa: { ativo: true } },
        include: { empresa: true },
      })
    : null;

  if (membro) {
    return {
      sessao,
      email,
      nome: sessao.nome,
      dono,
      empresa: resumo(membro.empresa),
      membroId: membro.id,
      papel: membro.papel,
    };
  }

  if (dono && empresaId) {
    const empresa = await prisma.empresa.findFirst({ where: { id: empresaId, ativo: true } });
    if (empresa) {
      return { sessao, email, nome: sessao.nome, dono, empresa: resumo(empresa), membroId: null, papel: "ADMIN" };
    }
  }

  // Nenhuma empresa escolhida (ou a escolhida não vale mais): decidir sozinho
  // quando só há uma opção, senão mandar escolher.
  const opcoes = await empresasDoUsuario(email);
  if (opcoes.length === 1) {
    redirect(`/api/empresa/${opcoes[0].id}/entrar?voltar=/demandas`);
  }
  redirect("/empresas");
}

/** Só para telas que não dependem de empresa (escolha de empresa, cadastro). */
export async function exigirSessao(): Promise<{ sessao: SessaoSSO; email: string; dono: boolean }> {
  const sessao = await lerSessaoSSO();
  if (!sessao) redirect(urlLoginSSO());
  const email = sessao.email.toLowerCase();
  return { sessao, email, dono: ehDonoDaPlataforma(email) };
}

function resumo(e: { id: string; slug: string; nome: string; modoAutomacao: "SOMBRA" | "REAL" }) {
  return { id: e.id, slug: e.slug, nome: e.nome, modoAutomacao: e.modoAutomacao };
}

export const NOME_COOKIE_EMPRESA = COOKIE_EMPRESA;
