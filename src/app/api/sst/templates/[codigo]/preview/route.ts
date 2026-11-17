import { NextRequest, NextResponse } from "next/server";
import { exigirOperador } from "@/lib/tenant";
import { exigirModulo } from "@/servicos/modulos";
import { prisma } from "@/lib/prisma";
import { obterConfiguracaoSst } from "@/servicos/configuracao-sst";
import { obterNr } from "@/dominio/catalogo-nr";
import { renderizarCertificadoHtml } from "@/servicos/renderizador-documentos-sst";
import { urlDeDownload } from "@/lib/storage";
import { conteudoProgramaticoDaNorma } from "@/servicos/documentos-sst";
import { logoPadraoCliente } from "@/dominio/logo-cliente";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ codigo: string }> }) {
  const op = await exigirOperador();
  await exigirModulo(op.empresa.id, "SST");
  const { codigo } = await params;
  const norma = obterNr(codigo);
  if (!norma) return new NextResponse("NR não encontrada", { status: 404 });
  const clienteId = request.nextUrl.searchParams.get("cliente");
  const [cliente, configuracao, normaEditada] = await Promise.all([
    clienteId ? prisma.cliente.findFirst({ where: { id: clienteId, empresaId: op.empresa.id } }) : prisma.cliente.findFirst({ where: { empresaId: op.empresa.id }, orderBy: { nome: "asc" } }),
    obterConfiguracaoSst(op.empresa.id),
    prisma.normaSst.findFirst({ where: { empresaId: op.empresa.id, codigo: norma.codigo } }),
  ]);
  const logoClienteUrl = cliente?.logoChave ? await urlDeDownload(cliente.logoChave, "logo-cliente") : null;
  const html = renderizarCertificadoHtml({
    norma: norma.codigo,
    participante: "Nome do participante",
    cpf: "000.000.000-00",
    clienteNome: cliente?.nome ?? "Empresa cliente",
    clienteDocumento: cliente?.documento,
    treinamento: norma.titulo,
    realizadoEm: new Date(),
    cargaHorariaMin: 480,
    instrutor: configuracao?.responsavelNome ?? "Responsável técnico",
    responsavelRegistro: configuracao?.responsavelRegistro ?? "Registro profissional",
    logoGrbUrl: configuracao?.logoPrincipalUrl ?? "/grb-logo-completa.png",
    logoClienteUrl: logoClienteUrl ?? configuracao?.logoClienteUrl ?? logoPadraoCliente(cliente?.nome ?? ""),
    conteudoProgramatico: conteudoProgramaticoDaNorma(normaEditada?.textoReferencia, norma.conteudoProgramatico),
  });
  return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Content-Security-Policy": "default-src 'none'; img-src 'self' data: https:; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'self'" } });
}
