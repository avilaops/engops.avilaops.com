import { exigirOperador } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { exigirModulo } from "@/servicos/modulos";
import { gerarOrdemServicoPdf } from "@/servicos/documentos-sst";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const op = await exigirOperador(); await exigirModulo(op.empresa.id, "SST"); const { id } = await params;
  const ordem = await prisma.ordemServicoSst.findFirst({ where: { id, empresaId: op.empresa.id }, include: { empresa: true, funcionario: true } });
  if (!ordem) return new Response("Ordem não encontrada.", { status: 404 });
  const bytes = await gerarOrdemServicoPdf({ numero: ordem.numero, funcionario: ordem.funcionario.nome, empresa: ordem.empresa.nome, emitidaEm: ordem.emitidaEm, atividades: ordem.atividades, riscos: ordem.riscos, medidas: ordem.medidas, epis: ordem.epis });
  return new Response(Buffer.from(bytes), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${ordem.numero}.pdf"` } });
}
