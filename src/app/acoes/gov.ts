"use server";

import { revalidatePath } from "next/cache";
import { exigirOperador } from "@/lib/tenant";
import { atualizarSalvaGov, salvarOportunidadeGov } from "@/servicos/gov";

export type EstadoGov = { erro?: string; ok?: string };
export async function salvarGovAction(_: EstadoGov, form: FormData): Promise<EstadoGov> {
  const op = await exigirOperador();
  try {
    const bruto = form.get("dados");
    if (typeof bruto !== "string" || bruto.length > 65000) throw new Error("Oportunidade inválida.");
    await salvarOportunidadeGov(op, JSON.parse(bruto));
    revalidatePath("/gov");
    return { ok: "Oportunidade salva nesta empresa." };
  } catch (e) { return { erro: e instanceof Error ? e.message : "Não foi possível salvar." }; }
}

export async function analisarGovAction(_: EstadoGov, form: FormData): Promise<EstadoGov> {
  const op = await exigirOperador();
  try {
    await atualizarSalvaGov(op, String(form.get("id") ?? ""), String(form.get("notas") ?? ""), String(form.get("situacao") ?? ""));
    revalidatePath("/gov");
    return { ok: "Análise atualizada." };
  } catch (e) { return { erro: e instanceof Error ? e.message : "Não foi possível atualizar." }; }
}
