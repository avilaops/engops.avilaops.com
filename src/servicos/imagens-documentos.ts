import path from "node:path";
import { readFile } from "node:fs/promises";
import { urlDeDownload } from "@/lib/storage";

const MIME: Record<string, string> = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp" };

export async function resolverImagemDocumento(referencia: string | null | undefined): Promise<string | null> {
  if (!referencia) return null;
  if (referencia.startsWith("engops/")) return urlDeDownload(referencia, "logo");
  if (!referencia.startsWith("/") || referencia.startsWith("//") || referencia.includes("\\") || referencia.split("/").includes("..")) throw new Error("Referência de imagem inválida.");
  const relativo = referencia.slice(1); const extensao = path.extname(relativo).toLowerCase(); const mime = MIME[extensao];
  if (!mime) throw new Error("Formato de imagem não permitido.");
  const raiz = path.resolve(process.cwd(), "public"); const arquivo = path.resolve(raiz, relativo);
  if (!arquivo.startsWith(`${raiz}${path.sep}`)) throw new Error("Referência de imagem inválida.");
  return `data:${mime};base64,${(await readFile(arquivo)).toString("base64")}`;
}
