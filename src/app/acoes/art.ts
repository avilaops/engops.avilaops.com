"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auditar } from "@/lib/auditoria";
import { prisma } from "@/lib/prisma";
import { pode } from "@/lib/rbac";
import { exigirOperador } from "@/lib/tenant";
import type { EstadoAcao } from "./demandas";

const registro = z.object({
  numero: z.string().trim().toUpperCase().regex(/^\d{5,20}(?:-SP)?$/).transform((numero) => numero.replace(/-SP$/, "")),
  documentoId: z.string().cuid(),
  codigos: z.array(z.string().regex(/^ENG-\d{1,20}$/)).min(1).max(50),
  confirmado: z.literal("on"),
});

export async function vincularArtAction(_: EstadoAcao, form: FormData): Promise<EstadoAcao> {
  const op = await exigirOperador();
  if (!pode(op.papel, "automacao.preparar") || !pode(op.papel, "documento.enviar")) {
    return { erro: "Sem permissão para vincular a ART." };
  }
  const entrada = registro.safeParse({
    numero: form.get("numero"), documentoId: form.get("documentoId"),
    codigos: form.getAll("codigo"), confirmado: form.get("confirmado"),
  });
  if (!entrada.success) return { erro: "Confira o número de registro, o PDF selecionado e a confirmação das OS." };
  const { numero, documentoId, codigos } = entrada.data;
  const empresaId = op.empresa.id;

  try {
    const vinculadas = await prisma.$transaction(async (tx) => {
      const demandas = await tx.demanda.findMany({
        where: { empresaId, codigo: { in: codigos } },
        select: { id: true, numeroOs: true, uf: true, tipoServico: true, cliente: { select: { empresaId: true, documento: true } } },
      });
      const ordens = new Set(demandas.map((demanda) => demanda.numeroOs?.trim().toUpperCase()));
      const tipos = new Set(demandas.map((demanda) => demanda.tipoServico));
      if (demandas.length !== codigos.length || ordens.size !== demandas.length || ordens.has(undefined) || ordens.has("") || tipos.size !== 1 ||
          demandas.some(({ uf, cliente }) => uf?.trim().toUpperCase() !== "SP" || cliente?.empresaId !== empresaId || !/^00360305\d{6}$/.test(cliente.documento?.replace(/\D/g, "") ?? ""))) {
        return null;
      }
      const demandaIds = demandas.map((demanda) => demanda.id);
      const documento = await tx.documento.findFirst({
        where: { id: documentoId, empresaId, demandaId: { in: demandaIds }, tipo: "ART", mime: "application/pdf", removidoEm: null },
        select: { id: true },
      });
      if (!documento) return null;
      const art = await tx.artMultipla.create({
        data: { empresaId, numero, documentoId, criadoPor: op.email, itens: { create: demandaIds.map((demandaId) => ({ demandaId })) } },
      });
      await auditar({
        empresaId, usuario: op.email, acao: "art_multipla.vinculada", objetoTipo: "ArtMultipla",
        objetoId: art.id, depois: { numero, documentoId, demandaIds },
      }, tx);
      return demandaIds;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    if (!vinculadas) return { erro: "Confira se o PDF de ART está ativo no dossiê de uma das OS e se todas pertencem ao lote CAIXA/SP." };
    for (const id of vinculadas) revalidatePath(`/demandas/${id}`);
    revalidatePath("/automacoes/art");
    return { ok: `ART ${numero}-SP vinculada a ${vinculadas.length} OS.` };
  } catch (erro) {
    if (erro instanceof Prisma.PrismaClientKnownRequestError) {
      if (erro.code === "P2002") return { erro: "Este número de ART ou PDF já foi vinculado. Consulte as ARTs nas demandas." };
      if (erro.code === "P2034") return { erro: "Os dados foram alterados durante o vínculo. Atualize a página e tente novamente." };
    }
    throw erro;
  }
}
