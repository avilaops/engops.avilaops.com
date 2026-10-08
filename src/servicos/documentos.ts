import type { CategoriaDocumento, OrigemDocumento, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auditar, emitirEvento } from "@/lib/auditoria";
import { gravarArquivo, hashSha256, nomeSeguro } from "@/lib/storage";
import { EVENTOS } from "@/dominio/eventos";
import { categoriaDoTipo, mimeAceito, nomePadronizado, pastaDaCategoria, TAMANHO_MAXIMO } from "@/dominio/documentos";
import { revalidarDemanda } from "@/servicos/validacao";

export class DocumentoRecusado extends Error {}

export async function enviarDocumento(opcoes: {
  demandaId: string;
  empresaId: string;
  usuario: string;
  tipo: string;
  categoria?: CategoriaDocumento;
  nomeOriginal: string;
  mime: string;
  buffer: Buffer;
  origem?: OrigemDocumento;
}) {
  const { demandaId, empresaId, usuario, tipo, nomeOriginal, mime, buffer } = opcoes;
  if (!mimeAceito(mime)) throw new DocumentoRecusado(`Tipo de arquivo não aceito: ${mime}`);
  if (buffer.length === 0) throw new DocumentoRecusado("Arquivo vazio");
  if (buffer.length > TAMANHO_MAXIMO) throw new DocumentoRecusado("Arquivo maior que 40 MB");

  const demanda = await prisma.demanda.findFirst({ where: { id: demandaId, empresaId }, include: { empresa: { select: { slug: true } } } });
  if (!demanda) throw new Error("Demanda não encontrada");

  const hash = hashSha256(buffer);
  const duplicado = await prisma.documento.findFirst({ where: { demandaId, hash, removidoEm: null } });
  if (duplicado) return { documento: duplicado, duplicado: true as const };

  const categoria = opcoes.categoria ?? categoriaDoTipo(tipo);
  const anterior = await prisma.documento.findFirst({ where: { demandaId, tipo, removidoEm: null }, orderBy: { versao: "desc" } });
  const versao = (anterior?.versao ?? 0) + 1;
  const nomeArquivo = nomePadronizado(demanda.codigo, categoria, tipo, versao, nomeOriginal);
  const chave = `engops/${demanda.empresa.slug}/${demanda.codigo}/${pastaDaCategoria(categoria)}/${nomeSeguro(nomeArquivo)}`;
  const chaveGravada = await gravarArquivo(chave, buffer, mime);

  const documento = await prisma.$transaction(async (tx) => {
    const d = await tx.documento.create({
      data: {
        empresaId,
        demandaId,
        categoria,
        tipo,
        nomeOriginal,
        nomeArquivo,
        chave: chaveGravada,
        mime,
        tamanho: buffer.length,
        hash,
        versao,
        origem: opcoes.origem ?? "UPLOAD",
        enviadoPor: usuario,
        substituiId: anterior?.id ?? null,
      },
    });
    await auditar({ empresaId, usuario, acao: "documento.enviado", objetoTipo: "Documento", objetoId: d.id, depois: { demandaId, tipo, nomeArquivo, versao, hash } }, tx);
    await emitirEvento(empresaId, EVENTOS.DocumentoEnviado, { demandaId, documentoId: d.id, tipo, categoria, versao }, tx);
    return d;
  });

  await revalidarDemanda(demandaId);
  return { documento, duplicado: false as const };
}

export async function removerDocumento(id: string, empresaId: string, usuario: string) {
  const d = await prisma.documento.findFirst({ where: { id, empresaId, removidoEm: null } });
  if (!d) throw new Error("Documento não encontrado");
  await prisma.$transaction(async (tx) => {
    await tx.documento.update({ where: { id }, data: { removidoEm: new Date() } });
    await auditar({ empresaId, usuario, acao: "documento.removido", objetoTipo: "Documento", objetoId: id, antes: { tipo: d.tipo, nomeArquivo: d.nomeArquivo } }, tx);
    await emitirEvento(empresaId, EVENTOS.DocumentoRemovido, { demandaId: d.demandaId, documentoId: id, tipo: d.tipo }, tx);
  });
  await revalidarDemanda(d.demandaId);
}

/** O operador confere o documento e registra os valores que leu nele. */
export async function conferirDocumento(id: string, empresaId: string, usuario: string, dados: Record<string, string>) {
  const d = await prisma.documento.findFirst({ where: { id, empresaId, removidoEm: null } });
  if (!d) throw new Error("Documento não encontrado");
  const limpos: Record<string, string> = {};
  for (const [k, v] of Object.entries(dados)) if (v && v.trim()) limpos[k] = v.trim();
  await prisma.$transaction(async (tx) => {
    await tx.documento.update({ where: { id }, data: { dados: limpos as Prisma.InputJsonValue } });
    await auditar({ empresaId, usuario, acao: "documento.conferido", objetoTipo: "Documento", objetoId: id, antes: d.dados ?? undefined, depois: limpos }, tx);
  });
  return revalidarDemanda(d.demandaId);
}

export async function reclassificarDocumento(id: string, empresaId: string, usuario: string, tipo: string) {
  const d = await prisma.documento.findFirst({ where: { id, empresaId, removidoEm: null }, include: { demanda: { select: { codigo: true } } } });
  if (!d) throw new Error("Documento não encontrado");
  const categoria = categoriaDoTipo(tipo);
  const nomeArquivo = nomePadronizado(d.demanda.codigo, categoria, tipo, d.versao, d.nomeOriginal);
  await prisma.$transaction(async (tx) => {
    await tx.documento.update({ where: { id }, data: { tipo, categoria, nomeArquivo } });
    await auditar({ empresaId, usuario, acao: "documento.reclassificado", objetoTipo: "Documento", objetoId: id, antes: { tipo: d.tipo }, depois: { tipo } }, tx);
  });
  await revalidarDemanda(d.demandaId);
}
