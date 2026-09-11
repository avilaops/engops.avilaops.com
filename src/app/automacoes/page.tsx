import Link from "next/link";
import AppShell from "@/components/AppShell";
import { JobBadge, ModoBadge } from "@/components/Badges";
import BotaoProcessar from "@/components/BotaoProcessar";
import { exigirOperador } from "@/lib/tenant";
import { pode } from "@/lib/rbac";
import { dataHora } from "@/lib/formatos";
import { painelAutomacoes } from "@/servicos/automacoes";
import { healthcheckSimil } from "@/automation/adapters/simil";

export const dynamic = "force-dynamic";

/** Central de automações: o que roda agora, a fila, o que concluiu e o que falhou. */
export default async function Automacoes() {
  const op = await exigirOperador();
  const [p, simil] = await Promise.all([painelAutomacoes(op.empresa.id), healthcheckSimil()]);
  const workerLigado = process.env.ENGOPS_WORKER === "1";

  return (
    <AppShell operador={op} section="automacoes">
      <div className="page-header">
        <div><h1>Automações</h1><p>Cada execução deixa timeline, evidência e erro tipado.</p></div>
        <div className="page-actions">
          <ModoBadge modo={op.empresa.modoAutomacao} />
          {pode(op.papel, "automacao.executar") && !workerLigado ? <BotaoProcessar /> : null}
        </div>
      </div>
      <div className="stat-grid" style={{ marginBottom: 16 }}>
        <div className="stat"><small>Executando agora</small><strong>{p.executando.length}</strong></div>
        <div className="stat"><small>Na fila</small><strong>{p.fila}</strong></div>
        <div className={p.aguardando ? "stat warn" : "stat"}><small>Aguardando pessoa</small><strong>{p.aguardando}</strong></div>
        <div className="stat good"><small>Concluídas hoje</small><strong>{p.concluidasHoje}</strong></div>
        <div className={p.erros ? "stat bad" : "stat"}><small>Com erro</small><strong>{p.erros}</strong></div>
      </div>

      <section className="panel">
        <div className="panel-title"><h2>Integrações</h2><span className="subtle">{workerLigado ? "processador ligado" : "processador desligado neste ambiente"}</span></div>
        <div className="ios-list" style={{ border: 0 }}>
          <div className="ios-row"><span className="ios-row-label"><strong>SIMIL</strong><small>{simil.detalhe}</small></span><span className={simil.ok ? "badge badge-good" : "badge badge-warn"}>{simil.ok ? "driver real ok" : "somente sombra"}</span></div>
          <div className="ios-row"><span className="ios-row-label"><strong>RAE</strong><small>Gerador entra na Fase 6.</small></span><span className="badge">em breve</span></div>
          <div className="ios-row"><span className="ios-row-label"><strong>SIOPI</strong><small>Módulo entra na Fase 7.</small></span><span className="badge">em breve</span></div>
        </div>
      </section>

      {p.executando.length ? (
        <section className="panel">
          <div className="panel-title"><h2>Executando agora</h2></div>
          <div className="ios-list" style={{ border: 0 }}>
            {p.executando.map((j) => (
              <Link key={j.id} href={`/automacoes/${j.id}`} className="ios-row">
                <span className="ios-row-label"><strong>{j.demanda?.codigo ?? "—"} · {j.workflow}</strong><small>etapa {j.etapaAtual + 1} de {j.totalEtapas} · desde {dataHora(j.iniciadoEm)}</small></span>
                <JobBadge status={j.status} />
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="panel">
        <div className="panel-title"><h2>Recentes</h2></div>
        {!p.recentes.length ? <p className="muted">Nenhuma execução ainda. Abra uma demanda pronta e toque em &quot;Preparar SIMIL&quot;.</p> : null}
        <div className="ios-list" style={{ border: 0 }}>
          {p.recentes.map((j) => (
            <Link key={j.id} href={`/automacoes/${j.id}`} className="ios-row">
              <span className="ios-row-label">
                <strong>{j.demanda?.codigo ?? "—"} · {j.workflow}</strong>
                <small>{j.modo === "SOMBRA" ? "sombra" : "real"} · etapa {Math.min(j.etapaAtual + 1, j.totalEtapas)}/{j.totalEtapas} · {dataHora(j.criadoEm)} · {j.criadoPor.split("@")[0]}{j.erroCodigo ? ` · ${j.erroCodigo}` : ""}</small>
              </span>
              <JobBadge status={j.status} />
            </Link>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
