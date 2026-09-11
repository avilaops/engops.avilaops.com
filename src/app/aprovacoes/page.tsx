import Link from "next/link";
import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import { exigirOperador } from "@/lib/tenant";
import { pode } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { dataHora } from "@/lib/formatos";
import { Icone } from "@/components/ui/Icones";

export const dynamic = "force-dynamic";

const TIPO: Record<string, string> = {
  CONFIRMAR_SIMIL_SOMBRA: "Confirmar SIMIL feito à mão (modo sombra)",
  EXECUTAR_SIMIL: "Executar no SIMIL",
};

/** Fila de decisões humanas. Cada linha leva para a demanda, onde estão os dados. */
export default async function Aprovacoes() {
  const op = await exigirOperador();
  if (!pode(op.papel, "automacao.aprovar")) redirect("/demandas");
  const [pendentes, recentes] = await Promise.all([
    prisma.aprovacao.findMany({ where: { empresaId: op.empresa.id, status: "PENDENTE" }, include: { demanda: { select: { id: true, codigo: true, endereco: true, numero: true } } }, orderBy: { solicitadaEm: "asc" } }),
    prisma.aprovacao.findMany({ where: { empresaId: op.empresa.id, status: { not: "PENDENTE" } }, include: { demanda: { select: { id: true, codigo: true } } }, orderBy: { decididaEm: "desc" }, take: 20 }),
  ]);

  return (
    <AppShell operador={op} section="aprovacoes">
      <div className="page-header"><div><h1>Aprovações</h1><p>{pendentes.length} aguardando decisão.</p></div></div>
      <section className="panel">
        <div className="panel-title"><h2>Pendentes</h2></div>
        {!pendentes.length ? <p className="muted">Nada para aprovar.</p> : null}
        <div className="ios-list" style={{ border: 0 }}>
          {pendentes.map((a) => {
            const r = a.resumo as Record<string, number>;
            return (
              <Link key={a.id} href={`/demandas/${a.demanda.id}#aprovacao`} className="ios-row">
                <span className="ios-row-label">
                  <strong>{a.demanda.codigo} · {TIPO[a.tipo] ?? a.tipo}</strong>
                  <small>{r.total} campos, {r.validados} validados{r.revisar ? `, ${r.revisar} para revisar` : ""} · pedido por {a.solicitadaPor.split("@")[0]} em {dataHora(a.solicitadaEm)}</small>
                </span>
                <Icone nome="chevron" tamanho={16} className="chevron" />
              </Link>
            );
          })}
        </div>
      </section>
      {recentes.length ? (
        <section className="panel">
          <div className="panel-title"><h2>Decididas recentemente</h2></div>
          <div className="ios-list" style={{ border: 0 }}>
            {recentes.map((a) => (
              <Link key={a.id} href={`/demandas/${a.demanda.id}`} className="ios-row">
                <span className="ios-row-label"><strong>{a.demanda.codigo} · {TIPO[a.tipo] ?? a.tipo}</strong><small>{a.decididaPor?.split("@")[0]} · {dataHora(a.decididaEm)}{a.motivo ? ` · ${a.motivo}` : ""}</small></span>
                <span className={a.status === "APROVADA" ? "badge badge-good" : "badge badge-bad"}>{a.status === "APROVADA" ? "Aprovada" : "Recusada"}</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </AppShell>
  );
}
