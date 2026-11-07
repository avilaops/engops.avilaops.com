"use server";

import { revalidatePath } from "next/cache";
import { exigirOperador } from "@/lib/tenant";
import { pode } from "@/lib/rbac";
import { prepararLoteSimil, previaLoteSimil, type PreviaLote, type ResultadoLote } from "@/servicos/lotes";

export async function previaLoteAction(ids: string[]): Promise<{ resultados?: PreviaLote[]; erro?: string }> {
  const op = await exigirOperador();
  if (!pode(op.papel, "automacao.preparar")) return { erro: "Sem permissão para preparar automação." };
  if (!Array.isArray(ids) || ids.length > 50) return { erro: "Selecione até 50 demandas." };
  try {
    return { resultados: await previaLoteSimil(ids, op.empresa.id) };
  } catch {
    return { erro: "Não foi possível validar o lote. Confira a disponibilidade do SIMIL e tente novamente." };
  }
}

export async function prepararLoteAction(ids: string[]): Promise<{ resultados?: ResultadoLote[]; erro?: string }> {
  const op = await exigirOperador();
  if (!pode(op.papel, "automacao.preparar")) return { erro: "Sem permissão para preparar automação." };
  if (!Array.isArray(ids) || ids.length > 50) return { erro: "Selecione até 50 demandas." };
  try {
    const resultados = await prepararLoteSimil(ids, op.empresa.id, op.email);
    revalidatePath("/automacoes");
    revalidatePath("/demandas");
    return { resultados };
  } catch (erro) {
    return { erro: erro instanceof Error ? erro.message : "Falha ao preparar lote." };
  }
}
