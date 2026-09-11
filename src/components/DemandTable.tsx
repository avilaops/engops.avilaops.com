import Link from "next/link";
import type { Demanda } from "@prisma/client";
import { Prazo, PrioridadeBadge, StatusBadge } from "@/components/Badges";
import { nomeDoTipo } from "@/dominio/demandas";

export type DemandaLista = Demanda & {
  cliente: { id: string; nome: string } | null;
  responsavel: { id: string; nome: string } | null;
  _count: { documentos: number; pendencias: number };
};

export default function DemandTable({ demandas }: { demandas: DemandaLista[] }) {
  if (!demandas.length) {
    return (
      <div className="demand-table">
        <div className="demand-empty">Nenhuma demanda com esses filtros.</div>
      </div>
    );
  }
  return (
    <div className="demand-table" role="table" aria-label="Demandas">
      <div className="demand-row head" role="row">
        <span>Código</span><span>Imóvel / serviço</span><span>Proprietário</span><span>Responsável</span><span>Prazo</span><span>Estado</span>
      </div>
      {demandas.map((d) => (
        <Link key={d.id} href={`/demandas/${d.id}`} className="demand-row" role="row">
          <span className="codigo">{d.codigo}{d.numeroOs ? <small className="subtle" style={{ display: "block" }}>OS {d.numeroOs}</small> : null}</span>
          <span className="titulo">
            <strong>{[d.endereco, d.numero].filter(Boolean).join(", ") || "Endereço não informado"}</strong>
            <small>{[d.municipio, d.uf].filter(Boolean).join("/")}{d.municipio ? " · " : ""}{nomeDoTipo(d.tipoServico)}</small>
          </span>
          <span className="titulo prop">
            <strong>{d.proprietarioNome ?? "—"}</strong>
            <small>{d.cliente?.nome ?? ""}</small>
          </span>
          <span className="responsavel muted">{d.responsavel?.nome ?? "sem responsável"}</span>
          <span className="prazo"><Prazo prazo={d.prazo} /></span>
          <span className="status" style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            <StatusBadge status={d.status} />
            <PrioridadeBadge prioridade={d.prioridade} />
            {d._count.pendencias ? <span className="badge badge-warn">{d._count.pendencias} pend.</span> : null}
          </span>
        </Link>
      ))}
    </div>
  );
}
