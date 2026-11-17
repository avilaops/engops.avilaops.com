"use server";

import { ModuloEngOps } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirSessao } from "@/lib/tenant";
import { definirModuloEmpresa } from "@/servicos/modulos";

const entradaModuloSchema = z.object({
  empresaId: z.string().min(1),
  modulo: z.nativeEnum(ModuloEngOps),
  ativo: z.enum(["true", "false"]).transform((valor) => valor === "true"),
});

export async function definirModuloAction(formData: FormData): Promise<void> {
  const sessao = await exigirSessao();
  if (!sessao.dono) throw new Error("Somente o dono da plataforma pode administrar módulos.");
  const entrada = entradaModuloSchema.parse(Object.fromEntries(formData));
  await definirModuloEmpresa({ ...entrada, usuario: sessao.email });
  revalidatePath("/empresas");
}
