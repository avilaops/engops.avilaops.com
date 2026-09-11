import Link from "next/link";
import { notFound } from "next/navigation";
import AppShell from "@/components/AppShell";
import { JobBadge, ModoBadge } from "@/components/Badges";
import { Explicacao } from "@/components/Historico";
import AcoesJob from "@/components/AcoesJob";
import { exigirOperador } from "@/lib/tenant";
import { pode } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { dataHora, hora } from "@/lib/formatos";
import { obterWorkflow } from "@/automation/core/registro";
import "@/automation/workflows";

export const dynamic = "force-dynamic";

export default async function DetalheJob({ params }: { params: Promise<{ id: string }> }) {
  const op = await exigirOperador();
  const { id } = await params;
  const j = await prisma.job.findFirst({ where: { id, empresaId: op.empresa.id }, include: { demanda: { select: { id: true, codigo: true } }, eventos: { orderBy: { criadoEm: "asc" } }, aprovacao: true } });
  if (!j) notFound();
  let etapas: string[] = [];
  try { etapas = obterWorkflow(j.workflow).etapas.map((e) => e.nome); } catch { /* workflow de outro build */ }
  const duracao = j.iniciadoEm ? Math.round(((j.terminadoEm ?? new Date()).getTime() - j.iniciadoEm.getTime()) / 1000) : null;

  return (
    <AppShell operador={op} section="automacoes">
      <div className="page-header">
        <div>
          <p className="subtle"><Link href="/automacoes">Automações</Link> / {j.id.slice(-8)}</p>
          <h1>{j.workflow}{j.demanda ? <span className="muted" style={{ fontWeight: 400 }}> · <Link href={`/demandas/${j.demanda.id}`}>{j.demanda.codigo}</Link></span> : null}</h1>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
            <JobBadge status={j.status} /><ModoBadge modo={j.modo} />
            <span className="badge">etapa {Math.min(j.etapaAtual + 1, j.totalEtapas)} de {j.totalEtapas}</span>
            <span className="badge">tentativa {j.tentativas + (j.status === "RUNNING" ? 1 : 0)} de {j.maxTentativas}</span>
            {duracao !== null ? <span className="badge">{duracao}s</span> : null}
          </div>
        </div>
        {pode(op.papel, "automacao.executar") ? <AcoesJob id={j.id} status={j.status} /> : null}
      </div>

      {j.status === "FAILED" ? <Explicacao codigo={j.erroCodigo} mensagem={j.erroMensagem} /> : null}
      {j.status === "WAITING_USER" && j.demanda ? (
        <div className="next-action warn" style={{ marginBottom: 16 }}>
          <div><small>Aguardando pessoa</small><strong>Este job está parado esperando decisão na demanda.</strong></div>
          <Link href={`/demandas/${j.demanda.id}#aprovacao`} className="primary-button">Ir para a demanda</Link>
        </div>
      ) : null}

      <div className="grid-main">
        <section className="panel">
          <div className="panel-title"><h2>Timeline</h2><span className="subtle">{j.eventos.length} evento(s)</span></div>
          <div className="timeline">
            {j.eventos.map((e) => (
              <div key={e.id} className={`timeline-item ${e.nivel}`}>
                <time title={dataHora(e.criadoEm)}>{hora(e.criadoEm)}</time>
                <span>{e.mensagem}{e.dados ? <details><summary className="subtle">detalhes</summary><pre className="mono" style={{ whiteSpace: "pre-wrap", fontSize: "0.75rem" }}>{JSON.stringify(e.dados, null, 2)}</pre></details> : null}</span>
              </div>
            ))}
          </div>
        </section>
        <div className="stack">
          <section className="panel">
            <div className="panel-title"><h2>Etapas</h2></div>
            {etapas.map((nome, i) => {
              const feita = i < j.etapaAtual || j.status === "SUCCESS";
              const atual = i === j.etapaAtual && j.status !== "SUCCESS";
              return (
                <div className="check-item" key={nome}>
                  <span className={`estado-icone ${feita ? "estado-OK" : atual ? (j.status === "FAILED" ? "estado-BLOQUEADO" : "estado-REVISAR") : "estado-PENDENTE"}`}>{feita ? "✓" : atual ? (j.status === "FAILED" ? "✕" : "…") : i + 1}</span>
                  <span>{nome}</span>
                </div>
              );
            })}
          </section>
          <section className="panel">
            <div className="panel-title"><h2>Identificação</h2></div>
            <dl className="kv">
              <dt>Job</dt><dd className="mono">{j.id}</dd>
              <dt>Chave de idempotência</dt><dd className="mono" style={{ fontSize: "0.75rem" }}>{j.chaveIdempotencia}</dd>
              <dt>Pedido por</dt><dd>{j.criadoPor}</dd>
              <dt>Criado</dt><dd>{dataHora(j.criadoEm)}</dd>
              <dt>Iniciado</dt><dd>{dataHora(j.iniciadoEm) || "—"}</dd>
              <dt>Terminado</dt><dd>{dataHora(j.terminadoEm) || "—"}</dd>
              <dt>Worker</dt><dd className="mono">{j.travadoPor ?? "—"}</dd>
            </dl>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
