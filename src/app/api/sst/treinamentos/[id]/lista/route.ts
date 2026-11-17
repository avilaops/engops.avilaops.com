import { exigirOperador } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { exigirModulo } from "@/servicos/modulos";
import { gerarListaParticipacaoPdf } from "@/servicos/documentos-sst";
import { gravarArquivo } from "@/lib/storage";
import { chaveListaSst } from "@/servicos/storage-sst";
import { podeAlterarPessoas } from "@/dominio/modulos";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const op = await exigirOperador(); await exigirModulo(op.empresa.id, "SST"); const { id } = await params;
  const treinamento = await prisma.treinamentoSst.findFirst({ where: { id, empresaId: op.empresa.id }, include: { cliente: true, norma: true, participantes: { include: { funcionario: true } } } });
  if (!treinamento) return new Response("Treinamento não encontrado.", { status: 404 });
  const bytes = await gerarListaParticipacaoPdf({ titulo: `${treinamento.norma?.codigo ?? "SST"} • ${treinamento.titulo}`, empresa: treinamento.cliente.nome, realizadoEm: treinamento.inicio, participantes: treinamento.participantes.map(p => ({ nome: p.funcionario.nome, presente: p.presente, aprovado: p.aprovado })) });
  if (podeAlterarPessoas(op.papel)) await gravarArquivo(chaveListaSst(op.empresa.id, treinamento.id), Buffer.from(bytes), "application/pdf");
  return new Response(Buffer.from(bytes), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="lista-${treinamento.id}.pdf"` } });
}
