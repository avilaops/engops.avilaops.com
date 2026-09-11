import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type Cliente = Prisma.TransactionClient | typeof prisma;

export type RegistroAuditoria = {
  empresaId: string;
  usuario: string;
  acao: string;
  objetoTipo: string;
  objetoId: string;
  antes?: unknown;
  depois?: unknown;
  origem?: string;
  metadados?: Record<string, unknown>;
};

/**
 * Trilha de auditoria. Grava na mesma transação do fato quando `tx` é passado:
 * sem isso teríamos fato sem registro (falhou depois) ou registro sem fato.
 */
export async function auditar(registro: RegistroAuditoria, tx: Cliente = prisma) {
  await tx.auditoria.create({
    data: {
      empresaId: registro.empresaId,
      usuario: registro.usuario,
      acao: registro.acao,
      objetoTipo: registro.objetoTipo,
      objetoId: registro.objetoId,
      antes: json(registro.antes),
      depois: json(registro.depois),
      origem: registro.origem ?? "ui",
      metadados: json(registro.metadados),
    },
  });
}

/**
 * Evento de domínio na outbox. Consumido pelo entregador (`src/automation/outbox.ts`)
 * que manda ao n8n; CRM, Planner e mensageria ouvem de lá.
 */
export async function emitirEvento(
  empresaId: string,
  nome: string,
  payload: Record<string, unknown>,
  tx: Cliente = prisma,
) {
  await tx.eventoDominio.create({ data: { empresaId, nome, payload: json(payload) ?? {} } });
}

function json(valor: unknown): Prisma.InputJsonValue | undefined {
  if (valor === undefined || valor === null) return undefined;
  return JSON.parse(JSON.stringify(valor)) as Prisma.InputJsonValue;
}
