import { gravarArquivo, removerArquivo } from "@/lib/storage";
import { nomeArquivoSeguro } from "@/servicos/documentos-sst";

type Gravador = (chave: string, buffer: Buffer, mime: string) => Promise<string>;
type Removedor = (chave: string) => Promise<void>;

export function chaveCertificadoSst(empresaId: string, numero: string, emissaoId: string) {
  return `engops/${empresaId}/sst/certificados/${nomeArquivoSeguro(`${numero}-${emissaoId}`)}.pdf`;
}

export function chaveListaSst(empresaId: string, treinamentoId: string) {
  return `engops/${empresaId}/sst/listas/${nomeArquivoSeguro(treinamentoId)}.pdf`;
}

export function chaveOrdemSst(empresaId: string, clienteId: string, numero: string) {
  return `engops/${empresaId}/sst/ordens/${nomeArquivoSeguro(`${clienteId}-${numero}`)}.pdf`;
}

export async function persistirPdfSst<T>(dados: {
  chave: string;
  bytes: Uint8Array;
  registrar: (chaveArmazenada: string) => Promise<T>;
}, gravar: Gravador = gravarArquivo, remover: Removedor = removerArquivo): Promise<T> {
  const chaveArmazenada = await gravar(dados.chave, Buffer.from(dados.bytes), "application/pdf");
  try {
    return await dados.registrar(chaveArmazenada);
  } catch (erro) {
    await remover(chaveArmazenada).catch(() => undefined);
    throw erro;
  }
}
