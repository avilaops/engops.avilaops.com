import { exigirOperador } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { exigirModulo } from "@/servicos/modulos";
import { gerarCertificadoPdf } from "@/servicos/documentos-sst";
import { lerArquivoLocal, urlDeDownload } from "@/lib/storage";
import { NextResponse } from "next/server";

export async function GET(_: Request, { params }: { params: Promise<{ participanteId: string }> }) {
  const op = await exigirOperador(); await exigirModulo(op.empresa.id, "SST"); const { participanteId } = await params;
  const certificado = await prisma.certificadoSst.findFirst({ where: { participanteId, empresaId: op.empresa.id }, include: { participante: { include: { funcionario: true, treinamento: { include: { norma: true } } } }, empresa: true } });
  if (!certificado) return new Response("Certificado não encontrado.", { status: 404 });
  if (certificado.status !== "ATIVO") return new Response("Certificado invalidado.", { status: 410 });
  if (certificado.arquivoChave && (certificado.arquivoChave.startsWith("local:") || certificado.arquivoChave.startsWith("engops/"))) {
    const url = await urlDeDownload(certificado.arquivoChave, `${certificado.numero}.pdf`);
    if (url) return NextResponse.redirect(url, 302);
    const stream = lerArquivoLocal(certificado.arquivoChave);
    if (stream) {
      const partes: Buffer[] = []; for await (const parte of stream) partes.push(Buffer.from(parte));
      return new Response(Buffer.concat(partes), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${certificado.numero}.pdf"`, "Cache-Control": "private, no-store" } });
    }
  }
  const t = certificado.participante.treinamento;
  const bytes = await gerarCertificadoPdf({ funcionario: certificado.participante.funcionario.nome, empresa: certificado.empresa.nome, treinamento: t.titulo, norma: t.norma?.codigo ?? "SST", cargaHorariaMin: t.cargaHorariaMin, realizadoEm: t.inicio, instrutor: t.instrutor });
  return new Response(Buffer.from(bytes), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${certificado.numero}.pdf"` } });
}
