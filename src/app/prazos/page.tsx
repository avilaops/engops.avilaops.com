import Link from "next/link";
import AppShell from "@/components/AppShell";
import { Prazo, StatusBadge } from "@/components/Badges";
import { exigirOperador } from "@/lib/tenant";
import { listarDemandas } from "@/servicos/demandas";
import { progressoDoStatus } from "@/dominio/demandas";

export const dynamic = "force-dynamic";

const FAIXAS = [
  ["atrasadas", "Atrasadas"],
  ["hoje", "Hoje"],
  ["amanha", "Amanhã"],
  ["semana", "Esta semana"],
] as const;

/** Visão por prazo. Cada faixa é a mesma consulta da central, só que agrupada. */
export default async function Prazos() {
  const op = await exigirOperador();
  const grupos = await Promise.all(FAIXAS.map(async ([faixa, rotulo]) => ({ faixa, rotulo, demandas: await listarDemandas(op.empresa.id, { prazo: faixa }, 100) })));
  const semPrazo = await listarDemandas(op.empresa.id, { abertas: true }, 300).then((ds) => ds.filter((d) => !d.prazo));

  return (
    <AppShell operador={op} section="prazos">
      <div className="page-header">
        <div><h1>Prazos</h1><p>O que vence, em ordem de urgência. Amanhã as demandas de &quot;amanhã&quot; já estão em &quot;hoje&quot;.</p></div>
      </div>
      {grupos.map((g) => (
        <section className="panel" key={g.faixa}>
          <div className="panel-title"><h2>{g.rotulo}</h2><span className={g.faixa === "atrasadas" && g.demandas.length ? "badge badge-bad" : "badge"}>{g.demandas.length}</span></div>
          {!g.demandas.length ? <p className="muted">Nada aqui.</p> : null}
          <div className="ios-list" style={{ border: 0 }}>
            {g.demandas.map((d) => (
              <Link key={d.id} href={`/demandas/${d.id}`} className="ios-row">
                <span className="ios-row-label">
                  <strong>{d.codigo} · {[d.endereco, d.numero].filter(Boolean).join(", ") || "sem endereço"}</strong>
                  <small>{d.responsavel?.nome ?? "sem responsável"} · {progressoDoStatus(d.status)}% concluída</small>
                  <span className="progress" style={{ marginTop: 6, maxWidth: 220 }}><span style={{ width: `${progressoDoStatus(d.status)}%` }} /></span>
                </span>
                <span className="ios-row-value"><Prazo prazo={d.prazo} /><br /><StatusBadge status={d.status} /></span>
              </Link>
            ))}
          </div>
        </section>
      ))}
      {semPrazo.length ? (
        <section className="panel">
          <div className="panel-title"><h2>Sem prazo</h2><span className="badge badge-warn">{semPrazo.length}</span></div>
          <div className="ios-list" style={{ border: 0 }}>
            {semPrazo.map((d) => (
              <Link key={d.id} href={`/demandas/${d.id}/editar`} className="ios-row">
                <span className="ios-row-label"><strong>{d.codigo}</strong><small>toque para definir o prazo</small></span>
                <StatusBadge status={d.status} />
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </AppShell>
  );
}
