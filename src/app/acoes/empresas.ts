"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { exigirOperador, exigirSessao, NOME_COOKIE_EMPRESA } from "@/lib/tenant";
import { pode } from "@/lib/rbac";
import { criarEmpresa, desligarMembro, esquemaEmpresa, esquemaMembro, mudarModoAutomacao, salvarMembro } from "@/servicos/empresas";

export type EstadoAcao = { erro?: string; ok?: string };

function mensagem(e: unknown): string {
  if (e instanceof z.ZodError) return e.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("\n");
  return e instanceof Error ? e.message : "Falhou";
}

export async function criarEmpresaAction(_: EstadoAcao, form: FormData): Promise<EstadoAcao> {
  const { email, dono, sessao } = await exigirSessao();
  if (!dono) return { erro: "Só o dono da plataforma cria empresas." };
  let id: string;
  try {
    const dados = esquemaEmpresa.parse({ nome: form.get("nome"), cnpj: form.get("cnpj"), slug: form.get("slug") });
    const e = await criarEmpresa(email, dados, { email, nome: sessao.nome });
    id = e.id;
  } catch (e) {
    return { erro: mensagem(e) };
  }
  (await cookies()).set(NOME_COOKIE_EMPRESA, id, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 30 });
  redirect("/demandas");
}

export async function salvarMembroAction(_: EstadoAcao, form: FormData): Promise<EstadoAcao> {
  const op = await exigirOperador();
  if (!pode(op.papel, "empresa.administrar")) return { erro: "Sem permissão." };
  try {
    const dados = esquemaMembro.parse({ email: form.get("email"), nome: form.get("nome"), papel: form.get("papel") });
    await salvarMembro(op.empresa.id, op.email, dados);
    return { ok: `${dados.nome} incluído como ${dados.papel.toLowerCase()}.` };
  } catch (e) {
    return { erro: mensagem(e) };
  }
}

export async function desligarMembroAction(id: string): Promise<EstadoAcao> {
  const op = await exigirOperador();
  if (!pode(op.papel, "empresa.administrar")) return { erro: "Sem permissão." };
  try {
    await desligarMembro(op.empresa.id, op.email, id);
    return { ok: "Acesso desligado." };
  } catch (e) {
    return { erro: mensagem(e) };
  }
}

export async function mudarModoAction(modo: "SOMBRA" | "REAL"): Promise<EstadoAcao> {
  const op = await exigirOperador();
  if (!pode(op.papel, "empresa.administrar")) return { erro: "Sem permissão." };
  if (modo === "REAL" && !op.dono) return { erro: "Ligar o modo real é decisão do dono da plataforma, depois das execuções validadas em sombra." };
  try {
    await mudarModoAutomacao(op.empresa.id, op.email, modo);
    return { ok: modo === "REAL" ? "Modo real ligado." : "Modo sombra ligado." };
  } catch (e) {
    return { erro: mensagem(e) };
  }
}
