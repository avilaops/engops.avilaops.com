import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auditar } from "@/lib/auditoria";
import { configuracaoSstSchema, type ConfiguracaoSst } from "@/dominio/configuracao-sst";

export async function obterConfiguracaoSst(empresaId: string): Promise<ConfiguracaoSst | null> {
  const registro = await prisma.moduloEmpresa.findUnique({ where: { empresaId_modulo: { empresaId, modulo: "SST" } }, select: { configuracao: true } });
  const config = registro?.configuracao && typeof registro.configuracao === "object" ? (registro.configuracao as Record<string, unknown>).sst : null;
  const resultado = configuracaoSstSchema.safeParse(config); return resultado.success ? resultado.data : null;
}

export async function salvarConfiguracaoSst(empresaId: string, usuario: string, dados: ConfiguracaoSst) {
  await prisma.$transaction(async tx => {
    const atual = await tx.moduloEmpresa.findUnique({ where: { empresaId_modulo: { empresaId, modulo: "SST" } } });
    if (!atual?.ativo) throw new Error("Módulo SST não habilitado para esta empresa.");
    const anterior = atual.configuracao && typeof atual.configuracao === "object" ? atual.configuracao as Record<string, unknown> : {};
    const configuracao = { ...anterior, versao: Number(anterior.versao ?? 0) + 1, sst: dados } as Prisma.InputJsonValue;
    await tx.moduloEmpresa.update({ where: { id: atual.id }, data: { configuracao } });
    await auditar({ empresaId, usuario, acao: "sst.configuracao_atualizada", objetoTipo: "ModuloEmpresa", objetoId: atual.id, antes: atual.configuracao, depois: configuracao }, tx);
  });
}
