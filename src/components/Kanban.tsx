import Link from "next/link";
import { Prazo, PrioridadeBadge } from "@/components/Badges";
import { COLUNAS_KANBAN, nomeDoStatus } from "@/dominio/demandas";
import type { DemandaLista } from "@/components/DemandTable";

export default function Kanban({ demandas }: { demandas: DemandaLista[] }) {
  return (
    <div className="kanban">
      {COLUNAS_KANBAN.map((col) => {
        const itens = demandas.filter((d) => col.status.includes(d.status));
        return (
          <section key={col.chave} className="kanban-col" aria-label={col.rotulo}>
            <h3><span>{col.rotulo}</span><span>{itens.length}</span></h3>
            {itens.map((d) => (
              <Link key={d.id} href={`/demandas/${d.id}`} className="kanban-card">
                <span className="codigo">{d.codigo}{d.numeroOs ? ` · OS ${d.numeroOs}` : ""}</span>
                <strong>{[d.endereco, d.numero].filter(Boolean).join(", ") || "Endereço não informado"}</strong>
                <small className="muted">{d.proprietarioNome ?? "—"}</small>
                <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", fontSize: "0.8rem" }}>
                  <span className="badge">{nomeDoStatus(d.status)}</span>
                  <PrioridadeBadge prioridade={d.prioridade} />
                  <span style={{ marginLeft: "auto" }}><Prazo prazo={d.prazo} /></span>
                </div>
              </Link>
            ))}
            {!itens.length ? <p className="subtle" style={{ padding: 8 }}>Nada aqui.</p> : null}
          </section>
        );
      })}
    </div>
  );
}
