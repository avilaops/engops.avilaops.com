import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exigirOperador } from "@/lib/tenant";
import { exigirModulo } from "@/servicos/modulos";
import { lerArquivoLocal, urlDeDownload } from "@/lib/storage";

export async function GET(_: Request, { params }: { params: Promise<{ emissaoId: string }> }) {
  const op = await exigirOperador();
  await exigirModulo(op.empresa.id, "SST");
  const { emissaoId } = await params;
  const emissao = await prisma.emissaoCertificadoSst.findFirst({ where: { id: emissaoId, empresaId: op.empresa.id } });
  if (!emissao) return new Response("Emissão não encontrada.", { status: 404 });
  const url = await urlDeDownload(emissao.arquivoChave, `${emissao.numero}-v${emissao.versao}.pdf`);
  if (url) return NextResponse.redirect(url, 302);
  const stream = lerArquivoLocal(emissao.arquivoChave);
  if (!stream) return new Response("Arquivo da emissão não encontrado.", { status: 404 });
  const partes: Buffer[] = [];
  for await (const parte of stream) partes.push(Buffer.from(parte));
  return new Response(Buffer.concat(partes), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${emissao.numero}-v${emissao.versao}.pdf"`, "Cache-Control": "private, no-store" } });
}
