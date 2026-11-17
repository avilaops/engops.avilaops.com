import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Onde os documentos moram. Com as quatro variáveis do R2 configuradas o
 * arquivo vai para o bucket e a leitura é por URL assinada de 5 minutos;
 * sem elas, grava em ./storage (desenvolvimento) e serve pela rota interna.
 *
 * Mesmo desenho do `app.avilaops.com/src/lib/r2.ts`: quando virar package
 * `@avila-ops/documents`, é daqui que ele sai.
 */

function temR2(): boolean {
  return Boolean(
    process.env.R2_BUCKET &&
      process.env.CLOUDFLARE_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY,
  );
}

function bucket(): string {
  const v = process.env.R2_BUCKET;
  if (!v) throw new Error("Configure R2_BUCKET");
  return v;
}

let cliente: S3Client | null = null;
function s3(): S3Client {
  if (cliente) return cliente;
  cliente = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
  return cliente;
}

function raizLocal(): string {
  return process.env.ENGOPS_STORAGE_PATH
    ? path.resolve(/* turbopackIgnore: true */ process.env.ENGOPS_STORAGE_PATH)
    : path.join(process.cwd(), "storage");
}

export function hashSha256(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

export function nomeSeguro(nome: string): string {
  return nome.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120);
}

/** Grava e devolve a chave. A chave é o caminho no dossiê: engops/<empresa>/<demanda>/<pasta>/<arquivo>. */
export async function gravarArquivo(chave: string, buffer: Buffer, mime: string): Promise<string> {
  if (temR2()) {
    await s3().send(new PutObjectCommand({ Bucket: bucket(), Key: chave, Body: buffer, ContentType: mime }));
    return chave;
  }
  const destino = path.join(raizLocal(), chave);
  await mkdir(path.dirname(destino), { recursive: true });
  await writeFile(destino, buffer);
  return `local:${chave}`;
}

/** URL para baixar. `null` quando o arquivo é local (a rota /api/documentos/[id]/arquivo serve). */
export async function urlDeDownload(chave: string, nomeArquivo: string): Promise<string | null> {
  if (chave.startsWith("local:")) return null;
  const cmd = new GetObjectCommand({
    Bucket: bucket(),
    Key: chave,
    ResponseContentDisposition: `attachment; filename="${nomeSeguro(nomeArquivo)}"`,
  });
  return getSignedUrl(s3(), cmd, { expiresIn: 300 });
}

export function lerArquivoLocal(chave: string) {
  if (!chave.startsWith("local:")) return null;
  const relativo = chave.slice("local:".length);
  const raiz = raizLocal();
  const absoluto = path.resolve(raiz, relativo);
  if (!absoluto.startsWith(raiz)) return null;
  return createReadStream(absoluto);
}
