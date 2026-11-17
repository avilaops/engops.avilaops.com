import AppShell from "@/components/AppShell";
import { exigirOperador } from "@/lib/tenant";
import { exigirModulo } from "@/servicos/modulos";
import { prisma } from "@/lib/prisma";
import { TEMPLATES_NR } from "@/dominio/templates-nr";

export const dynamic = "force-dynamic";

export default async function TemplatesSst({ searchParams }: { searchParams: Promise<{ cliente?: string }> }) {
  const op = await exigirOperador();
  await exigirModulo(op.empresa.id, "SST");
  const sp = await searchParams;
  const clientes = await prisma.cliente.findMany({ where: { empresaId: op.empresa.id }, orderBy: { nome: "asc" } });
  const clienteId = clientes.some(cliente => cliente.id === sp.cliente) ? sp.cliente! : clientes[0]?.id;
  return <AppShell operador={op} section="sst"><div className="page-header"><div><h1>Modelos de certificados</h1><p>38 temas HTML/CSS • identidade GRB e empresa cliente</p></div></div>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>{clientes.map(cliente => <a className={cliente.id === clienteId ? "button" : "button button-secondary"} href={`/sst/templates?cliente=${cliente.id}`} key={cliente.id}>{cliente.nome}</a>)}</div>
    <div className="grid-2">{TEMPLATES_NR.map(template => <a className="panel" key={template.codigo} href={`/api/sst/templates/${template.codigo}/preview${clienteId ? `?cliente=${clienteId}` : ""}`} target="_blank" style={{ borderTop: `6px solid ${template.acento}` }}><strong>{template.codigo} • {template.titulo}</strong><p className="muted" style={{ marginTop: 6 }}>Tema {template.indiceVisual} • família {template.familia.toUpperCase()} • {template.simbolo}</p></a>)}</div>
  </AppShell>;
}
