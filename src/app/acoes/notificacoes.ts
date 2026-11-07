"use server";

import { revalidatePath } from "next/cache";
import { exigirOperador } from "@/lib/tenant";
import { marcarNotificacaoLida } from "@/servicos/notificacoes";

export async function marcarLidaAction(id: string): Promise<{ erro?: string }> {
  const op = await exigirOperador();
  if (typeof id !== "string" || !id || id.length > 200) return { erro: "Notificação inválida." };
  try {
    await marcarNotificacaoLida(op.empresa.id, op.email, id);
    revalidatePath("/notificacoes");
    return {};
  } catch {
    return { erro: "Não foi possível marcar como lida. Tente novamente." };
  }
}
