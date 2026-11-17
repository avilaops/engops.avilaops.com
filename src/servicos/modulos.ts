import type { ModuloEngOps } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { alteracoesDeDependencia } from "@/dominio/modulos";
import { auditar } from "@/lib/auditoria";

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
  await prisma.$transaction(async tx => {
    const atuais = await tx.moduloEmpresa.findMany({ where: { empresaId: entrada.empresaId, ativo: true }, select: { modulo: true } });
    const dependencias = alteracoesDeDependencia(entrada.modulo, entrada.ativo, atuais.map(item => item.modulo));
    const salvar = (modulo: ModuloEngOps, ativo: boolean) => tx.moduloEmpresa.upsert({ where: { empresaId_modulo: { empresaId: entrada.empresaId, modulo } }, create: { empresaId: entrada.empresaId, modulo, ativo, ativadoPor: entrada.usuario }, update: { ativo, ativadoPor: entrada.usuario } });
    const registro = await salvar(entrada.modulo, entrada.ativo);
    for (const dependencia of dependencias) await salvar(dependencia.modulo, dependencia.ativo);
    await auditar({ empresaId: entrada.empresaId, usuario: entrada.usuario, acao: "empresa.modulo_definido", objetoTipo: "ModuloEmpresa", objetoId: registro.id, depois: { modulo: entrada.modulo, ativo: entrada.ativo, dependencias } }, tx);
  });
}
