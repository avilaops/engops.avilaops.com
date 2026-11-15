import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auditar } from "@/lib/auditoria";
import { pode } from "@/lib/rbac";
import type { Operador } from "@/lib/tenant";
import { esquemaOportunidade } from "@/integracoes/gov";
import { chaveGov } from "@/dominio/gov-catalogo";

export const SITUACOES_GOV = ["SALVA", "EM_ANALISE", "INTERESSE", "DESCARTADA"] as const;
const conferirEdicao = (op: Operador) => { if (!pode(op.papel, "demanda.editar")) throw new Error("Sem permissão para alterar oportunidades."); };

export function listarSalvasGov(op: Operador) {
  return prisma.oportunidadeGovSalva.findMany({ where: { empresaId: op.empresa.id }, orderBy: { atualizadoEm: "desc" }, take: 500 });
}

export async function salvarOportunidadeGov(op: Operador, entrada: unknown) {
  conferirEdicao(op);
  const informado = esquemaOportunidade.parse(entrada);
  const registro = await prisma.govRegistro.findUnique({ where: { id: chaveGov(informado) } });
  const dados = registro ? esquemaOportunidade.parse(registro.dados) : informado;
  const existente = await prisma.oportunidadeGovSalva.findFirst({ where: {
    empresaId: op.empresa.id, externoId: dados.id,
    ...(dados.tipo === "PREGAO" ? { fonte: "COMPRAS" } : {}),
  }, orderBy: { criadoEm: "asc" } });
  const fonteSalva = existente?.fonte ?? dados.fonte;
  const salva = await prisma.oportunidadeGovSalva.upsert({
    where: { empresaId_fonte_externoId: { empresaId: op.empresa.id, fonte: fonteSalva, externoId: dados.id } },
    create: { empresaId: op.empresa.id, fonte: fonteSalva, externoId: dados.id, dados, salvoPor: op.email, registroId: registro?.id, revisaoVista: registro?.revisao ?? 0 },
    update: { dados, registroId: registro?.id, revisaoVista: registro?.revisao ?? 0 },
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
