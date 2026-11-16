import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auditar } from "@/lib/auditoria";
import type { Operador } from "@/lib/tenant";

export class ErroControleColetaGov extends Error {}
const esquemaControle = z.object({ id: z.string().min(1).max(100), operacao: z.enum(["pausar", "retomar"]) });

/** O catálogo é compartilhado; administrar uma empresa não autoriza controlá-lo. */
export async function controlarColetaGov(op: Operador, id: unknown, operacao: unknown) {
  if (!op.dono) throw new ErroControleColetaGov("Somente o dono da plataforma pode controlar as coletas compartilhadas.");
  const entrada = esquemaControle.safeParse({ id, operacao });
  if (!entrada.success) throw new ErroControleColetaGov("Controle de coleta inválido.");
  const habilitada = entrada.data.operacao === "retomar";
  return prisma.$transaction(async tx => {
    // Serializa controles concorrentes e a gravação de uma página do worker.
    const linhas = await tx.$queryRaw<{ id: string }[]>(Prisma.sql`SELECT id FROM gov_coletas WHERE id = ${entrada.data.id} FOR UPDATE`);
    if (!linhas.length) throw new ErroControleColetaGov("Coleta não encontrada.");
    const coleta = await tx.govColeta.findUnique({ where: { id: entrada.data.id } });
    if (!coleta) throw new ErroControleColetaGov("Coleta não encontrada.");
    if (coleta.habilitada === habilitada) return { alterou: false, habilitada };
    const agora = new Date();
    // A página já reservada pode concluir. Não cancela reserva, zera falhas,
    // reinicia cursores nem altera contadores ou cobertura histórica.
    await tx.govColeta.update({ where: { id: coleta.id }, data: { habilitada, ...(habilitada ? { proximaEm: agora } : {}) } });
    await auditar({
      empresaId: op.empresa.id, usuario: op.email, acao: `gov.coleta.${entrada.data.operacao}`,
      objetoTipo: "GovColeta", objetoId: coleta.id,
      antes: { habilitada: coleta.habilitada, proximaEm: coleta.proximaEm },
      depois: { habilitada, proximaEm: habilitada ? agora : coleta.proximaEm },
      metadados: { escopo: "catalogo-global" },
    }, tx);
    return { alterou: true, habilitada };
  });
}
