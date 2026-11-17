"use server";

import { revalidatePath } from "next/cache";
import { configuracaoSstSchema } from "@/dominio/configuracao-sst";
import { exigirOperador } from "@/lib/tenant";
import { pode } from "@/lib/rbac";
import { salvarConfiguracaoSst } from "@/servicos/configuracao-sst";

export async function salvarConfiguracaoSstAction(form: FormData): Promise<void> {
  const op = await exigirOperador(); if (!pode(op.papel, "empresa.administrar")) throw new Error("Sem permissão para configurar a empresa.");
  const dados = configuracaoSstSchema.parse(Object.fromEntries(form)); await salvarConfiguracaoSst(op.empresa.id, op.email, dados); revalidatePath("/empresa");
}
