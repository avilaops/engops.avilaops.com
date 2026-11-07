import Link from "next/link";
import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import ConferenciaArt from "@/components/ConferenciaArt";
import VincularArtForm from "@/components/VincularArtForm";
import { nomeDoTipo } from "@/dominio/demandas";
import { prisma } from "@/lib/prisma";
import { pode } from "@/lib/rbac";
import { exigirOperador } from "@/lib/tenant";

const LIMITE = 50;

export default async function ArtMultipla({ searchParams }: { searchParams: Promise<{ codigos?: string }> }) {
  const op = await exigirOperador();
  if (!pode(op.papel, "automacao.preparar")) redirect("/automacoes");
  const consulta = (await searchParams).codigos;
  const entrada = typeof consulta === "string" ? consulta.slice(0, 2001) : "";
  const codigos = [...new Set(entrada.toUpperCase().split(/[\s,;]+/).filter(Boolean))];
  const invalida = entrada.length > 2000 || codigos.length > LIMITE || codigos.some((codigo) => !/^ENG-\d{1,20}$/.test(codigo));
  const demandas = codigos.length && !invalida ? await prisma.demanda.findMany({
    where: { empresaId: op.empresa.id, codigo: { in: codigos } },
    select: {
      codigo: true, numeroOs: true, tipoServico: true, endereco: true, numero: true,
      complemento: true, bairro: true, municipio: true, uf: true, cep: true,
      cliente: { select: { empresaId: true, nome: true, documento: true } },
    },
    orderBy: { codigo: "asc" },
  }) : [];
  const encontrados = new Set(demandas.map((demanda) => demanda.codigo));
  const ausentes = codigos.filter((codigo) => !encontrados.has(codigo));
  const selecaoCompleta = !invalida && !ausentes.length && demandas.length > 0;
  const podeVincular = selecaoCompleta && pode(op.papel, "documento.enviar");
  const documentos = podeVincular ? await prisma.documento.findMany({
    where: {
      empresaId: op.empresa.id, demanda: { empresaId: op.empresa.id, codigo: { in: codigos } },
      tipo: "ART", mime: "application/pdf", removidoEm: null, artMultipla: null,
    },
    select: { id: true, nomeArquivo: true, demanda: { select: { codigo: true } } },
    orderBy: { criadoEm: "desc" },
  }) : [];
  const ordens = demandas.map((demanda) => {
    const cliente = demanda.cliente?.empresaId === op.empresa.id ? demanda.cliente : null;
    const cnpj = cliente?.documento?.replace(/\D/g, "") ?? "";
    const pendencias = [];
    if (!demanda.numeroOs?.trim()) pendencias.push("Número da OS ausente");
    if (!/^00360305\d{6}$/.test(cnpj)) pendencias.push("Confira o CNPJ da CAIXA no cadastro do contratante");
    if (![demanda.endereco, demanda.numero, demanda.bairro, demanda.municipio, demanda.cep].every((campo) => campo?.trim())) pendencias.push("Endereço da OS incompleto");
    if (demanda.uf?.trim().toUpperCase() !== "SP") pendencias.push("A jurisdição deste piloto é o CREA-SP");
    return {
      codigo: demanda.codigo,
      numeroOs: demanda.numeroOs?.trim() ?? "",
      tipoServico: demanda.tipoServico,
      servico: nomeDoTipo(demanda.tipoServico),
      contratante: cliente?.nome ?? "",
      cnpj,
      endereco: [demanda.endereco, demanda.numero, demanda.complemento, demanda.bairro, demanda.municipio, demanda.uf, demanda.cep].filter(Boolean).join(", "),
      pendencias,
    };
  });

  return (
    <AppShell operador={op} section="automacoes">
      <div className="page-header">
        <div><h1>ART Múltipla</h1><p>Conferência mensal de ordens de serviço da CAIXA para o CREA-SP.</p></div>
        <Link href="/automacoes" className="secondary-button">Voltar às automações</Link>
      </div>
      <form className="panel" action="/automacoes/art" method="get">
        <label className="field"><span>Códigos das demandas do EngOps</span><textarea name="codigos" defaultValue={entrada} maxLength={2000} rows={3} required placeholder="ENG-0001, ENG-0002" /></label>
        <p className="muted">Separe os códigos por espaço, vírgula ou quebra de linha. Até {LIMITE} demandas por conferência.</p>
        <button className="secondary-button">Carregar demandas</button>
        {invalida ? <p role="alert">Informe até {LIMITE} códigos no formato ENG-0001.</p> : null}
        {!invalida && ausentes.length > 0 ? <p role="alert">Códigos indisponíveis nesta empresa: {ausentes.join(", ")}.</p> : null}
      </form>
      {selecaoCompleta ? <ConferenciaArt key={codigos.join(",")} ordens={ordens} /> : null}
      {podeVincular ? <VincularArtForm key={codigos.join(",")} codigos={codigos} documentos={documentos} /> : null}
    </AppShell>
  );
}
