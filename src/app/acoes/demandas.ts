"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { StatusDemanda } from "@prisma/client";
import { z } from "zod";
import { exigirOperador } from "@/lib/tenant";
import { pode } from "@/lib/rbac";
import { abrirPendenciaManual, atualizarDemanda, criarDemanda, esquemaDemanda, mudarStatus, resolverPendencia } from "@/servicos/demandas";
import { conferirDocumento, DocumentoRecusado, enviarDocumento, reclassificarDocumento, removerDocumento } from "@/servicos/documentos";
import { pedirPreparacaoSimil } from "@/servicos/automacoes";
import { decidirAprovacao } from "@/servicos/aprovacoes";
import { cancelar, retomar } from "@/automation/core/fila";
import { prisma } from "@/lib/prisma";

export type EstadoAcao = { erro?: string; ok?: string };

function mensagem(e: unknown): string {
  if (e instanceof z.ZodError) return e.issues.map((i) => `${i.path.join(".") || "campo"}: ${i.message}`).join("\n");
  return e instanceof Error ? e.message : "Falhou";
}

function dadosDoForm(form: FormData) {
  const o: Record<string, FormDataEntryValue | null> = {};
  for (const k of Object.keys(esquemaDemanda.shape)) o[k] = form.get(k);
  return esquemaDemanda.parse(o);
}

export async function criarDemandaAction(_: EstadoAcao, form: FormData): Promise<EstadoAcao> {
  const op = await exigirOperador();
  if (!pode(op.papel, "demanda.criar")) return { erro: "Sem permissão para criar demanda." };
  let id: string;
  try {
    const d = await criarDemanda(op.empresa.id, op.email, dadosDoForm(form));
    id = d.id;
  } catch (e) {
    return { erro: mensagem(e) };
  }
  redirect(`/demandas/${id}`);
}

export async function atualizarDemandaAction(id: string, _: EstadoAcao, form: FormData): Promise<EstadoAcao> {
  const op = await exigirOperador();
  if (!pode(op.papel, "demanda.editar")) return { erro: "Sem permissão para editar." };
  try {
    await atualizarDemanda(id, op.empresa.id, op.email, dadosDoForm(form));
  } catch (e) {
    return { erro: mensagem(e) };
  }
  revalidatePath(`/demandas/${id}`);
  return { ok: "Salvo." };
}

export async function mudarStatusAction(id: string, para: StatusDemanda): Promise<EstadoAcao> {
  const op = await exigirOperador();
  const acao = para === "ARQUIVADA" ? "demanda.arquivar" : "demanda.editar";
  if (!pode(op.papel, acao)) return { erro: "Sem permissão." };
  try {
    await mudarStatus(id, op.empresa.id, para, op.email);
  } catch (e) {
    return { erro: mensagem(e) };
  }
  revalidatePath(`/demandas/${id}`);
  revalidatePath("/demandas");
  return { ok: "Estado alterado." };
}

export async function enviarDocumentoAction(demandaId: string, _: EstadoAcao, form: FormData): Promise<EstadoAcao> {
  const op = await exigirOperador();
  if (!pode(op.papel, "documento.enviar")) return { erro: "Sem permissão para enviar documento." };
  const arquivos = form.getAll("arquivo").filter((a): a is File => a instanceof File && a.size > 0);
  const tipo = String(form.get("tipo") || "OUTRO");
  if (!arquivos.length) return { erro: "Escolha ao menos um arquivo." };
  const resultados: string[] = [];
  try {
    for (const a of arquivos) {
      const r = await enviarDocumento({
        demandaId,
        empresaId: op.empresa.id,
        usuario: op.email,
        tipo,
        nomeOriginal: a.name,
        mime: a.type || "application/octet-stream",
        buffer: Buffer.from(await a.arrayBuffer()),
      });
      resultados.push(r.duplicado ? `${a.name}: já estava no dossiê (mesmo conteúdo)` : `${a.name} → ${r.documento.nomeArquivo}`);
    }
  } catch (e) {
    if (e instanceof DocumentoRecusado) return { erro: e.message };
    return { erro: mensagem(e) };
  }
  revalidatePath(`/demandas/${demandaId}`);
  return { ok: resultados.join("\n") };
}

export async function removerDocumentoAction(id: string, demandaId: string): Promise<EstadoAcao> {
  const op = await exigirOperador();
  if (!pode(op.papel, "documento.remover")) return { erro: "Sem permissão para remover documento." };
  try {
    await removerDocumento(id, op.empresa.id, op.email);
  } catch (e) {
    return { erro: mensagem(e) };
  }
  revalidatePath(`/demandas/${demandaId}`);
  return { ok: "Documento removido." };
}

export async function conferirDocumentoAction(id: string, demandaId: string, _: EstadoAcao, form: FormData): Promise<EstadoAcao> {
  const op = await exigirOperador();
  if (!pode(op.papel, "documento.enviar") && !pode(op.papel, "pendencia.resolver")) return { erro: "Sem permissão." };
  const dados: Record<string, string> = {};
  for (const [k, v] of form.entries()) if (typeof v === "string" && k.startsWith("dado.")) dados[k.slice(5)] = v;
  const tipo = form.get("tipo");
  try {
    if (typeof tipo === "string" && tipo) await reclassificarDocumento(id, op.empresa.id, op.email, tipo);
    await conferirDocumento(id, op.empresa.id, op.email, dados);
  } catch (e) {
    return { erro: mensagem(e) };
  }
  revalidatePath(`/demandas/${demandaId}`);
  return { ok: "Conferência registrada." };
}

export async function resolverPendenciaAction(id: string, demandaId: string): Promise<EstadoAcao> {
  const op = await exigirOperador();
  if (!pode(op.papel, "pendencia.resolver")) return { erro: "Sem permissão." };
  try {
    await resolverPendencia(id, op.empresa.id, op.email);
  } catch (e) {
    return { erro: mensagem(e) };
  }
  revalidatePath(`/demandas/${demandaId}`);
  revalidatePath("/pendencias");
  return { ok: "Pendência resolvida." };
}

export async function abrirPendenciaAction(demandaId: string, _: EstadoAcao, form: FormData): Promise<EstadoAcao> {
  const op = await exigirOperador();
  if (!pode(op.papel, "pendencia.resolver")) return { erro: "Sem permissão." };
  const titulo = String(form.get("titulo") || "").trim();
  const severidade = form.get("severidade") === "BLOQUEIA" ? "BLOQUEIA" : "AVISO";
  if (titulo.length < 3) return { erro: "Descreva a pendência." };
  try {
    await abrirPendenciaManual(demandaId, op.empresa.id, op.email, titulo, severidade);
  } catch (e) {
    return { erro: mensagem(e) };
  }
  revalidatePath(`/demandas/${demandaId}`);
  return { ok: "Pendência aberta." };
}

export async function prepararSimilAction(demandaId: string): Promise<EstadoAcao> {
  const op = await exigirOperador();
  if (!pode(op.papel, "automacao.preparar")) return { erro: "Sem permissão para preparar automação." };
  try {
    const r = await pedirPreparacaoSimil(demandaId, op.empresa.id, op.email);
    revalidatePath(`/demandas/${demandaId}`);
    return { ok: r.novo ? "Preparação do SIMIL enfileirada." : "Já existe uma preparação em andamento para este cadastro." };
  } catch (e) {
    return { erro: mensagem(e) };
  }
}

export async function decidirAprovacaoAction(id: string, decisao: "APROVADA" | "REJEITADA", motivo: string, protocolo?: string): Promise<EstadoAcao> {
  const op = await exigirOperador();
  if (!pode(op.papel, "automacao.aprovar")) return { erro: "Sem permissão para aprovar." };
  try {
    const a = await decidirAprovacao(id, op.empresa.id, op.email, decisao, motivo, protocolo ? { protocolo } : {});
    revalidatePath(`/demandas/${a.demandaId}`);
    revalidatePath("/aprovacoes");
    return { ok: decisao === "APROVADA" ? "Aprovado. O motor continua de onde parou." : "Recusado." };
  } catch (e) {
    return { erro: mensagem(e) };
  }
}

export async function retomarJobAction(id: string): Promise<EstadoAcao> {
  const op = await exigirOperador();
  if (!pode(op.papel, "automacao.executar")) return { erro: "Sem permissão." };
  try {
    await retomar(id, op.empresa.id, op.email);
    revalidatePath(`/automacoes/${id}`);
    return { ok: "Retomado." };
  } catch (e) {
    return { erro: mensagem(e) };
  }
}

export async function cancelarJobAction(id: string, motivo: string): Promise<EstadoAcao> {
  const op = await exigirOperador();
  if (!pode(op.papel, "automacao.executar")) return { erro: "Sem permissão." };
  try {
    await cancelar(id, op.empresa.id, op.email, motivo || "cancelado pelo operador");
    revalidatePath(`/automacoes/${id}`);
    return { ok: "Cancelado." };
  } catch (e) {
    return { erro: mensagem(e) };
  }
}

export async function processarAgoraAction(): Promise<EstadoAcao> {
  const op = await exigirOperador();
  if (!pode(op.papel, "automacao.executar")) return { erro: "Sem permissão." };
  const { umCiclo } = await import("@/automation/core/fila");
  await import("@/automation/workflows");
  let n = 0;
  while (n < 5 && (await umCiclo(`manual-${op.email}`))) n++;
  const pendentes = await prisma.job.count({ where: { empresaId: op.empresa.id, status: { in: ["QUEUED", "RETRYING"] } } });
  revalidatePath("/automacoes");
  return { ok: n ? `${n} job(s) processado(s). ${pendentes} na fila.` : "Nada na fila." };
}
