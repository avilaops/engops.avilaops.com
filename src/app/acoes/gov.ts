"use server";

import { revalidatePath } from "next/cache";
import { exigirOperador } from "@/lib/tenant";
import { atualizarSalvaGov, salvarOportunidadeGov } from "@/servicos/gov";
import { criarRegraGov, desativarRegraGov } from "@/servicos/gov-alertas";

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

export async function criarAlertaGovAction(_: EstadoGov, form: FormData): Promise<EstadoGov> {
  const op = await exigirOperador();
  try {
    const filtros = String(form.get("filtros") ?? "{}");
    if (filtros.length > 5000) throw new Error("Filtros inválidos");
    await criarRegraGov(op, form.get("nome"), JSON.parse(filtros));
    revalidatePath("/gov");
    return { ok: "Alerta criado nesta empresa. Novas publicações compatíveis aparecerão nas suas notificações." };
  } catch (e) { return { erro: e instanceof Error ? e.message : "Não foi possível criar o alerta." }; }
}

export async function removerAlertaGovAction(_: EstadoGov, form: FormData): Promise<EstadoGov> {
  const op = await exigirOperador();
  try {
    await desativarRegraGov(op, String(form.get("id") ?? ""));
    revalidatePath("/gov");
    return { ok: "Alerta desativado." };
  } catch (e) { return { erro: e instanceof Error ? e.message : "Não foi possível desativar." }; }
}

export async function analisarGovAction(_: EstadoGov, form: FormData): Promise<EstadoGov> {
  const op = await exigirOperador();
  try {
    await atualizarSalvaGov(op, String(form.get("id") ?? ""), String(form.get("notas") ?? ""), String(form.get("situacao") ?? ""));
    revalidatePath("/gov");
    return { ok: "Análise atualizada." };
  } catch (e) { return { erro: e instanceof Error ? e.message : "Não foi possível atualizar." }; }
}
