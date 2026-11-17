import type { CSSProperties } from "react";
import { ClipboardList, FileText, Search } from "lucide-react";
import AppShell from "@/components/AppShell";
import { filtrarTemplatesNr } from "@/dominio/templates-nr";
import { prisma } from "@/lib/prisma";
import { exigirOperador } from "@/lib/tenant";
import { exigirModulo } from "@/servicos/modulos";

export const dynamic = "force-dynamic";
type Filtros = { cliente?: string; busca?: string; situacao?: string };

export default async function TemplatesSst({ searchParams }: { searchParams: Promise<Filtros> }) {
  const op = await exigirOperador();
  await exigirModulo(op.empresa.id, "SST");
  const sp = await searchParams;
  const clientes = await prisma.cliente.findMany({ where: { empresaId: op.empresa.id }, orderBy: { nome: "asc" } });
  const clienteId = clientes.some(cliente => cliente.id === sp.cliente) ? sp.cliente! : clientes[0]?.id;
  const cliente = clientes.find(item => item.id === clienteId);
  const situacao = sp.situacao === "vigente" || sp.situacao === "revogada" ? sp.situacao : undefined;
  const templates = filtrarTemplatesNr({ busca: sp.busca, situacao });
  const queryCliente = clienteId ? `cliente=${encodeURIComponent(clienteId)}` : "";

  return <AppShell operador={op} section="sst">
    <div className="page-header"><div><h1>Modelos de certificados</h1><p>Certificados e listas de presença organizados por Norma Regulamentadora.</p></div><span className="badge badge-accent">{templates.length} de 38 modelos</span></div>
    <form className="template-filters" method="get">
      <label className="template-search"><Search size={16} aria-hidden="true" /><input name="busca" defaultValue={sp.busca ?? ""} placeholder="Buscar por NR ou tema" /></label>
      <select name="cliente" defaultValue={clienteId} aria-label="Empresa cliente">{clientes.map(item => <option value={item.id} key={item.id}>{item.nome}</option>)}</select>
      <select name="situacao" defaultValue={situacao ?? ""} aria-label="Situação da norma"><option value="">Todas as situações</option><option value="vigente">Vigentes</option><option value="revogada">Revogadas</option></select>
      <button className="primary-button" type="submit">Filtrar</button>
    </form>
    <section className="template-list" aria-label="Modelos de certificados NR">
      <div className="template-row template-head"><span>Norma</span><span>Tema do treinamento</span><span>Empresa</span><span>Situação</span><span>Ações</span></div>
      {templates.map(template => {
        const numero = Number(template.codigo.replace(/\D/g, ""));
        const revogada = numero === 2 || numero === 27;
        const preview = `/api/sst/templates/${template.codigo}/preview${queryCliente ? `?${queryCliente}` : ""}`;
        return <article className="template-row" key={template.codigo} style={{ "--template-accent": template.acento } as CSSProperties}>
          <div className="template-code"><span>{template.simbolo}</span><strong>{template.codigo}</strong></div>
          <div className="template-title"><strong>{template.titulo.replace(" • revogada", "")}</strong><small>Família visual {template.familia.toUpperCase()} • carga horária definida no treinamento</small></div>
          <span className="template-client">{cliente?.nome ?? "Selecione uma empresa"}</span>
          <span><span className={revogada ? "badge badge-bad" : "badge badge-good"}>{revogada ? "Revogada • não emitir" : "Disponível"}</span></span>
          <div className="template-actions">{revogada ? <span className="muted">Emissão bloqueada</span> : <><a className="row-action" href={preview} target="_blank"><FileText size={15} />Certificado</a><a className="row-action" href={`/sst${queryCliente ? `?${queryCliente}` : ""}#treinamentos`}><ClipboardList size={15} />Lista</a></>}</div>
        </article>;
      })}
      {!templates.length ? <div className="demand-empty">Nenhuma NR encontrada com esses filtros.</div> : null}
    </section>
  </AppShell>;
}
