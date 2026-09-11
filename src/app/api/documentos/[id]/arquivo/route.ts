import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { lerArquivoLocal, urlDeDownload } from "@/lib/storage";
import { exigirOperador } from "@/lib/tenant";

/** Baixa um documento. No R2 redireciona para URL assinada de 5 min; local serve o arquivo. */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const op = await exigirOperador();
  const { id } = await params;
  const d = await prisma.documento.findFirst({ where: { id, empresaId: op.empresa.id } });
  if (!d) return NextResponse.json({ erro: "não encontrado" }, { status: 404 });

  const url = await urlDeDownload(d.chave, d.nomeArquivo);
  if (url) return NextResponse.redirect(url, 302);

  const stream = lerArquivoLocal(d.chave);
  if (!stream) return NextResponse.json({ erro: "arquivo indisponível" }, { status: 404 });
  const chunks: Buffer[] = [];
  for await (const c of stream) chunks.push(Buffer.from(c));
  return new NextResponse(new Uint8Array(Buffer.concat(chunks)), {
    headers: { "content-type": d.mime, "content-disposition": `inline; filename="${d.nomeArquivo}"`, "cache-control": "private, no-store" },
  });
}
