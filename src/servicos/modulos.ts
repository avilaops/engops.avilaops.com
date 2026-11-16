import type { ModuloEngOps } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function modulosAtivosDaEmpresa(empresaId: string): Promise<ModuloEngOps[]> {
  const registros = await prisma.moduloEmpresa.findMany({
    where: { empresaId, ativo: true },
    select: { modulo: true },
    orderBy: { modulo: "asc" },
  });
  return registros.map((registro) => registro.modulo);
}

export async function exigirModulo(empresaId: string, modulo: ModuloEngOps): Promise<void> {
  const registro = await prisma.moduloEmpresa.findUnique({
    where: { empresaId_modulo: { empresaId, modulo } },
    select: { ativo: true },
  });
  if (!registro?.ativo) throw new Error("Módulo não habilitado para esta empresa.");
}

export async function definirModuloEmpresa(entrada: {
  empresaId: string;
  modulo: ModuloEngOps;
  ativo: boolean;
  usuario: string;
}): Promise<void> {
  await prisma.moduloEmpresa.upsert({
    where: { empresaId_modulo: { empresaId: entrada.empresaId, modulo: entrada.modulo } },
    create: { empresaId: entrada.empresaId, modulo: entrada.modulo, ativo: entrada.ativo, ativadoPor: entrada.usuario },
    update: { ativo: entrada.ativo, ativadoPor: entrada.usuario },
  });
}
