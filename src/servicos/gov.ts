import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auditar } from "@/lib/auditoria";
import { pode } from "@/lib/rbac";
import type { Operador } from "@/lib/tenant";
import { esquemaOportunidade } from "@/integracoes/gov";

export const SITUACOES_GOV = ["SALVA", "EM_ANALISE", "INTERESSE", "DESCARTADA"] as const;
const conferirEdicao = (op: Operador) => { if (!pode(op.papel, "demanda.editar")) throw new Error("Sem permissão para alterar oportunidades."); };

export function listarSalvasGov(op: Operador) {
  return prisma.oportunidadeGovSalva.findMany({ where: { empresaId: op.empresa.id }, orderBy: { atualizadoEm: "desc" }, take: 500 });
}

export async function salvarOportunidadeGov(op: Operador, entrada: unknown) {
  conferirEdicao(op);
  const dados = esquemaOportunidade.parse(entrada);
  const salva = await prisma.oportunidadeGovSalva.upsert({
    where: { empresaId_fonte_externoId: { empresaId: op.empresa.id, fonte: dados.fonte, externoId: dados.id } },
    create: { empresaId: op.empresa.id, fonte: dados.fonte, externoId: dados.id, dados, salvoPor: op.email },
    update: { dados },
  });
  await auditar({ empresaId: op.empresa.id, usuario: op.email, acao: "gov.oportunidade.salva", objetoTipo: "OportunidadeGov", objetoId: salva.id });
  return salva;
}

export async function atualizarSalvaGov(op: Operador, id: string, notas: string, situacao: string) {
  conferirEdicao(op);
  const dados = z.object({ id: z.string().min(1).max(100), notas: z.string().trim().max(10000), situacao: z.enum(SITUACOES_GOV) }).parse({ id, notas, situacao });
  const resultado = await prisma.oportunidadeGovSalva.updateMany({ where: { id: dados.id, empresaId: op.empresa.id }, data: { notas: dados.notas, situacao: dados.situacao } });
  if (!resultado.count) throw new Error("Oportunidade não encontrada nesta empresa.");
  await auditar({ empresaId: op.empresa.id, usuario: op.email, acao: "gov.oportunidade.analisada", objetoTipo: "OportunidadeGov", objetoId: dados.id, depois: { situacao: dados.situacao } });
}
