import { exigirOperador } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { exigirModulo } from "@/servicos/modulos";
import { gerarPdfDeHtml, renderizarListaParticipacaoHtml } from "@/servicos/renderizador-documentos-sst";
import { gravarArquivo } from "@/lib/storage";
import { chaveListaSst } from "@/servicos/storage-sst";
import { podeAlterarPessoas } from "@/dominio/modulos";
import { obterConfiguracaoSst } from "@/servicos/configuracao-sst";
import { resolverImagemDocumento } from "@/servicos/imagens-documentos";
import { logoPadraoCliente } from "@/dominio/logo-cliente";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const op = await exigirOperador(); await exigirModulo(op.empresa.id, "SST"); const { id } = await params;
  const treinamento = await prisma.treinamentoSst.findFirst({ where: { id, empresaId: op.empresa.id }, include: { cliente: true, norma: true, participantes: { include: { funcionario: true } } } });
  if (!treinamento) return new Response("Treinamento não encontrado.", { status: 404 });
  const configuracao = await obterConfiguracaoSst(op.empresa.id);
  const [logoGrbUrl, logoClienteUrl] = await Promise.all([
    resolverImagemDocumento(configuracao?.logoPrincipalUrl ?? "/grb-logo-completa.png"),
    resolverImagemDocumento(treinamento.cliente.logoChave ?? configuracao?.logoClienteUrl ?? logoPadraoCliente(treinamento.cliente.nome)),
  ]);
  const html = renderizarListaParticipacaoHtml({
    titulo: `${treinamento.norma?.codigo ?? "SST"} • ${treinamento.titulo}`,
    empresa: treinamento.cliente.nome,
    realizadoEm: treinamento.inicio,
    logoGrbUrl,
    logoClienteUrl,
    participantes: treinamento.participantes.map(p => ({ nome: p.funcionario.nome, cpf: p.funcionario.cpf, presente: p.presente, aprovado: p.aprovado })),
  });
  const bytes = await gerarPdfDeHtml(html, { landscape: false });
  if (podeAlterarPessoas(op.papel)) await gravarArquivo(chaveListaSst(op.empresa.id, treinamento.id), Buffer.from(bytes), "application/pdf");
  return new Response(Buffer.from(bytes), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="lista-${treinamento.id}.pdf"` } });
}
