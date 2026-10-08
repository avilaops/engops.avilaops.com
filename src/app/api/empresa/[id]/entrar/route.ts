import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { siteUrl } from "@/lib/sessao";
import { ehDonoDaPlataforma, exigirSessao, NOME_COOKIE_EMPRESA } from "@/lib/tenant";

/** Escolhe a empresa da sessão. Só entra em empresa da qual é membro (ou sendo dono da plataforma). */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { email } = await exigirSessao();
  const voltar = req.nextUrl.searchParams.get("voltar") || "/demandas";

  const membro = await prisma.membro.findFirst({ where: { empresaId: id, email, ativo: true, empresa: { ativo: true } } });
  const permitido = membro || (ehDonoDaPlataforma(email) && (await prisma.empresa.findFirst({ where: { id, ativo: true } })));
  if (!permitido) return NextResponse.redirect(new URL("/empresas?erro=sem-acesso", siteUrl()), 303);

  if (membro) await prisma.membro.update({ where: { id: membro.id }, data: { ultimoAcessoEm: new Date() } });

  const destino = voltar.startsWith("/") ? voltar : "/demandas";
  const r = NextResponse.redirect(new URL(destino, req.nextUrl.origin), 303);
  r.cookies.set(NOME_COOKIE_EMPRESA, id, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 30 });
  return r;
}
