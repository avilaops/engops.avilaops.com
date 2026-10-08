import Link from "next/link";
import type { EventoJob, Job } from "@prisma/client";
import { JobBadge } from "@/components/Badges";
import { dataHora, hora } from "@/lib/formatos";
import { explicarErro } from "@/automation/core/erros";

export default function Historico({ jobs }: { jobs: Array<Job & { eventos: EventoJob[] }> }) {
  if (!jobs.length) return null;
  return (
    <section className="panel">
      <div className="panel-title"><h2>Execuções</h2></div>
      {jobs.map((j) => (
        <div key={j.id} style={{ borderTop: "1px solid var(--line-soft)", paddingTop: 10, marginTop: 10 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 6 }}>
            <Link href={`/automacoes/${j.id}`}><strong>{j.workflow}</strong></Link>
            <JobBadge status={j.status} />
            <span className="subtle">etapa {Math.min(j.etapaAtual + 1, j.totalEtapas)} de {j.totalEtapas} · {dataHora(j.criadoEm)}</span>
          </div>
          {j.status === "FAILED" ? <Explicacao codigo={j.erroCodigo} mensagem={j.erroMensagem} /> : null}
          <div className="timeline">
            {j.eventos.slice(-6).map((e) => (
              <div key={e.id} className={`timeline-item ${e.nivel}`}>
                <time>{hora(e.criadoEm)}</time>
                <span>{e.mensagem}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

export function Explicacao({ codigo, mensagem }: { codigo: string | null; mensagem: string | null }) {
  const x = explicarErro(codigo);
  return (
    <dl className="explicacao" style={{ background: "var(--red-soft)", padding: 12, borderRadius: 10, margin: "6px 0 10px" }}>
      <dt>O que aconteceu</dt><dd><strong>{x.titulo}</strong>{mensagem ? <span className="muted"> · {mensagem}</span> : null}</dd>
      <dt>Motivo provável</dt><dd>{x.motivo}</dd>
      <dt>O que o sistema fez</dt><dd>{x.oQueOSistemaFez}</dd>
      <dt>O que fazer agora</dt><dd>{x.oQueFazer}</dd>
      <dt>Tentar de novo</dt><dd>{x.podeTentarDeNovo ? "sim, automaticamente" : "não até corrigir a causa"}</dd>
    </dl>
  );
}
