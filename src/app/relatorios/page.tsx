import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import { exigirOperador } from "@/lib/tenant";
import { pode } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { nomeDoStatus, STATUS, STATUS_ABERTOS } from "@/dominio/demandas";

export const dynamic = "force-dynamic";

/** Janela do relatório: últimos 30 dias e o início de hoje. Fora do componente porque relógio é efeito. */
function janela() {
  const desde = new Date(Date.now() - 30 * 86_400_000);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  return { desde, hoje };
}

/** Indicadores do período (30 dias) e funil. Tudo contado no banco, nada estimado. */
export default async function Relatorios() {
  const op = await exigirOperador();
  if (!pode(op.papel, "relatorio.ver")) redirect("/demandas");
  const e = op.empresa.id;
  const { desde, hoje } = janela();

  const [recebidas, entregues, atrasadas, porStatus, porResponsavel, jobs, pendenciasAbertas, sombra, entreguesComTempo] = await Promise.all([
    prisma.demanda.count({ where: { empresaId: e, criadoEm: { gte: desde } } }),
    prisma.demanda.count({ where: { empresaId: e, entregueEm: { gte: desde } } }),
    prisma.demanda.count({ where: { empresaId: e, status: { in: STATUS_ABERTOS }, prazo: { lt: hoje } } }),
    prisma.demanda.groupBy({ by: ["status"], where: { empresaId: e }, _count: { _all: true } }),
    prisma.demanda.groupBy({ by: ["responsavelId"], where: { empresaId: e, status: { in: STATUS_ABERTOS } }, _count: { _all: true } }),
    prisma.job.groupBy({ by: ["status"], where: { empresaId: e, criadoEm: { gte: desde } }, _count: { _all: true } }),
    prisma.pendencia.count({ where: { empresaId: e, resolvidaEm: null } }),
    prisma.execucaoExterna.count({ where: { demanda: { empresaId: e }, modo: "SOMBRA", status: "CONCLUIDA", terminadoEm: { gte: desde } } }),
    prisma.demanda.findMany({ where: { empresaId: e, entregueEm: { gte: desde } }, select: { dataEntrada: true, entregueEm: true } }),
  ]);
  const membros = await prisma.membro.findMany({ where: { empresaId: e }, select: { id: true, nome: true } });
  const nome = new Map(membros.map((m) => [m.id, m.nome]));
  const contagem = new Map(porStatus.map((s) => [s.status, s._count._all]));
  const jobsTotal = jobs.reduce((a, j) => a + j._count._all, 0);
  const jobsOk = jobs.find((j) => j.status === "SUCCESS")?._count._all ?? 0;
  const jobsFalha = jobs.find((j) => j.status === "FAILED")?._count._all ?? 0;
  const tempoMedio = entreguesComTempo.length ? entreguesComTempo.reduce((a, d) => a + (d.entregueEm!.getTime() - d.dataEntrada.getTime()), 0) / entreguesComTempo.length / 86_400_000 : null;

  const funil: Array<[string, number]> = [
    ["Recebidas (total)", porStatus.reduce((a, s) => a + s._count._all, 0)],
    ["Documentação pronta ou além", STATUS.map(([k]) => k).slice(3).reduce((a, k) => a + (contagem.get(k) ?? 0), 0)],
    ["SIMIL concluído ou além", ["SIMIL_CONCLUIDO", "RAE_PENDENTE", "RAE_CONCLUIDO", "SIOPI_PENDENTE", "EM_CONFERENCIA", "PRONTA_PARA_ENTREGA", "ENTREGUE", "ARQUIVADA"].reduce((a, k) => a + (contagem.get(k as never) ?? 0), 0)],
    ["Entregues", (contagem.get("ENTREGUE") ?? 0) + (contagem.get("ARQUIVADA") ?? 0)],
  ];

  return (
    <AppShell operador={op} section="relatorios">
      <div className="page-header"><div><h1>Relatórios</h1><p>Últimos 30 dias. Exportação CSV e XLSX entram na Fase 9.</p></div></div>
      <div className="stat-grid" style={{ marginBottom: 16 }}>
        <div className="stat"><small>Recebidas</small><strong>{recebidas}</strong></div>
        <div className="stat good"><small>Entregues</small><strong>{entregues}</strong></div>
        <div className={atrasadas ? "stat bad" : "stat"}><small>Atrasadas agora</small><strong>{atrasadas}</strong></div>
        <div className="stat"><small>Tempo médio (dias)</small><strong>{tempoMedio === null ? "—" : tempoMedio.toFixed(1)}</strong></div>
        <div className="stat"><small>Taxa de sucesso das automações</small><strong>{jobsTotal ? `${Math.round((jobsOk / jobsTotal) * 100)}%` : "—"}</strong></div>
        <div className={jobsFalha ? "stat warn" : "stat"}><small>Automações com falha</small><strong>{jobsFalha}</strong></div>
        <div className="stat"><small>Pendências abertas</small><strong>{pendenciasAbertas}</strong></div>
        <div className="stat"><small>SIMIL confirmados em sombra</small><strong>{sombra}</strong></div>
      </div>
      <div className="grid-2">
        <section className="panel">
          <div className="panel-title"><h2>Funil</h2></div>
          <div className="ios-list" style={{ border: 0 }}>
            {funil.map(([r, n]) => <div className="ios-row" key={r}><span className="ios-row-label">{r}</span><span className="ios-row-value"><strong>{n}</strong></span></div>)}
          </div>
        </section>
        <section className="panel">
          <div className="panel-title"><h2>Por estado</h2></div>
          <div className="ios-list" style={{ border: 0 }}>
            {STATUS.filter(([k]) => contagem.get(k)).map(([k, r]) => <div className="ios-row" key={k}><span className="ios-row-label">{r}</span><span className="ios-row-value">{contagem.get(k)}</span></div>)}
          </div>
        </section>
        <section className="panel">
          <div className="panel-title"><h2>Em andamento por responsável</h2></div>
          <div className="ios-list" style={{ border: 0 }}>
            {porResponsavel.map((r) => <div className="ios-row" key={r.responsavelId ?? "sem"}><span className="ios-row-label">{r.responsavelId ? nome.get(r.responsavelId) ?? "?" : "Sem responsável"}</span><span className="ios-row-value">{r._count._all}</span></div>)}
            {!porResponsavel.length ? <div className="ios-row"><span className="muted">Nada em andamento.</span></div> : null}
          </div>
        </section>
        <section className="panel">
          <div className="panel-title"><h2>Automações no período</h2></div>
          <div className="ios-list" style={{ border: 0 }}>
            {jobs.map((j) => <div className="ios-row" key={j.status}><span className="ios-row-label">{j.status}</span><span className="ios-row-value">{j._count._all}</span></div>)}
            {!jobs.length ? <div className="ios-row"><span className="muted">Nenhuma execução.</span></div> : null}
          </div>
        </section>
      </div>
      <p className="subtle" style={{ marginTop: 12 }}>{nomeDoStatus("ENTREGUE")} e arquivadas contam como concluídas.</p>
    </AppShell>
  );
}
