import { exigirOperador } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { exigirModulo } from "@/servicos/modulos";
import { gerarCertificadoPdf } from "@/servicos/documentos-sst";

export async function GET(_: Request, { params }: { params: Promise<{ participanteId: string }> }) {
  const op = await exigirOperador(); await exigirModulo(op.empresa.id, "SST"); const { participanteId } = await params;
  const certificado = await prisma.certificadoSst.findFirst({ where: { participanteId, empresaId: op.empresa.id }, include: { participante: { include: { funcionario: true, treinamento: { include: { norma: true } } } }, empresa: true } });
  if (!certificado) return new Response("Certificado não encontrado.", { status: 404 });
  const t = certificado.participante.treinamento;
  const bytes = await gerarCertificadoPdf({ funcionario: certificado.participante.funcionario.nome, empresa: certificado.empresa.nome, treinamento: t.titulo, norma: t.norma?.codigo ?? "SST", cargaHorariaMin: t.cargaHorariaMin, realizadoEm: t.inicio, instrutor: t.instrutor });
  return new Response(Buffer.from(bytes), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${certificado.numero}.pdf"` } });
}
