import AppShell from "@/components/AppShell";
import ClienteForm from "@/components/ClienteForm";
import { exigirOperador } from "@/lib/tenant";
import { pode } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Contratantes das demandas (agência, correspondente, construtora). É um
 * cadastro mínimo de propósito: o cliente comercial vive no CRM da Ávila Ops;
 * aqui é só quem aparece na OS.
 */
export default async function Clientes() {
  const op = await exigirOperador();
  const clientes = await prisma.cliente.findMany({ where: { empresaId: op.empresa.id }, include: { _count: { select: { demandas: true } } }, orderBy: { nome: "asc" } });
  return (
    <AppShell operador={op} section="clientes">
      <div className="page-header"><div><h1>Contratantes</h1><p>Quem pede o serviço. {clientes.length} cadastrado(s).</p></div></div>
      <div className="grid-2">
        <div className="ios-list">
          {!clientes.length ? <div className="ios-row"><span className="muted">Nenhum contratante ainda.</span></div> : null}
          {clientes.map((c) => (
            <a key={c.id} href={`/demandas?busca=${encodeURIComponent(c.nome)}&abertas=nao`} className="ios-row">
              <span className="ios-row-label"><strong>{c.nome}</strong><small>{[c.documento, c.email, c.telefone].filter(Boolean).join(" · ") || "sem contato"}</small></span>
              <span className="ios-row-value">{c._count.demandas} demanda(s)</span>
            </a>
          ))}
        </div>
        {pode(op.papel, "demanda.criar") ? <section className="panel"><div className="panel-title"><h2>Novo contratante</h2></div><ClienteForm /></section> : null}
      </div>
    </AppShell>
  );
}
