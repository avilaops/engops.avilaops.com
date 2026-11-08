import Link from "next/link";
import AppShell from "@/components/AppShell";
import { JobBadge, ModoBadge } from "@/components/Badges";
import BotaoProcessar from "@/components/BotaoProcessar";
import { exigirOperador } from "@/lib/tenant";
import { pode } from "@/lib/rbac";
import { dataHora } from "@/lib/formatos";
import { painelAutomacoes } from "@/servicos/automacoes";
import { healthcheckSimil } from "@/automation/adapters/simil";
import { prisma } from "@/lib/prisma";
import { whereDeFiltros } from "@/servicos/demandas";
import LoteSimil from "@/components/LoteSimil";

export const dynamic = "force-dynamic";

/** Central de automações: o que roda agora, a fila, o que concluiu e o que falhou. */
export default async function Automacoes() {
  const op = await exigirOperador();
  const [p, simil] = await Promise.all([painelAutomacoes(op.empresa.id), healthcheckSimil()]);
  const workerLigado = process.env.ENGOPS_WORKER === "1";
  const [prontas, atrasadas, aprovacoes] = await Promise.all([
    pode(op.papel, "automacao.preparar") ? prisma.demanda.findMany({ where: { empresaId: op.empresa.id, status: "PRONTA_PARA_PROCESSAMENTO" }, select: { id: true, codigo: true }, orderBy: [{ prazo: "asc" }, { id: "asc" }], take: 50 }) : Promise.resolve([]),
    prisma.demanda.count({ where: whereDeFiltros(op.empresa.id, { prazo: "atrasadas" }) }),
    pode(op.papel, "automacao.aprovar") ? prisma.aprovacao.count({ where: { empresaId: op.empresa.id, status: "PENDENTE" } }) : Promise.resolve(0),
  ]);

  return (
    <AppShell operador={op} section="automacoes">
      <div className="page-header automation-header">
        <div><span className="automation-eyebrow">Central de operação</span><h1>Automações e integrações</h1><p>Prepare demandas, acompanhe a fila e confira o que precisa da sua atenção.</p></div>
        <div className="page-actions">
          <ModoBadge modo={op.empresa.modoAutomacao} />
          {pode(op.papel, "relatorio.ver") ? <a href="/api/relatorios/demandas" className="secondary-button">Exportar demandas · CSV</a> : null}
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

      <section className="panel" aria-labelledby="alertas-titulo">
        <div className="panel-title"><h2 id="alertas-titulo">Atenção agora</h2><span className="subtle">Atualizado ao carregar a página</span></div>
        <div className="automation-alerts">
          <Link href="/demandas?prazo=atrasadas">{atrasadas} demanda(s) atrasada(s) <span aria-hidden="true">→</span></Link>
          {pode(op.papel, "automacao.aprovar") ? <Link href="/aprovacoes">{aprovacoes} aprovação(ões) pendente(s) <span aria-hidden="true">→</span></Link> : null}
          <a href="#historico">{p.erros} execução(ões) com erro <span aria-hidden="true">↓</span></a>
        </div>
        <p className="muted">{workerLigado ? "Processamento automático configurado neste ambiente." : "Processamento automático desativado. As preparações enfileiradas dependem do processamento manual por um operador autorizado."}</p>
      </section>

      <section className="panel" aria-labelledby="integracoes-titulo">
        <div className="panel-title"><h2 id="integracoes-titulo">Conexões e documentos</h2><span className="subtle">Disponibilidade por sistema</span></div>
        <div className="integration-grid">
          {pode(op.papel, "automacao.preparar") ? <article className="integration-card"><span className="automation-eyebrow">CREA-SP</span><h3>ART Múltipla</h3><p>Confira as ordens de serviço e a remuneração de um lote mensal da CAIXA.</p><Link href="/automacoes/art" className="secondary-button">Conferir lote de ART</Link></article> : null}
          <article className="integration-card"><span className="automation-eyebrow">Caixa · SIMIL</span><h3>Preparação de avaliações</h3><span className={simil.ok ? "badge badge-good" : "badge badge-warn"}>{simil.ok ? "Conector disponível" : "Envio real indisponível"}</span><p>{simil.detalhe}</p><p>No modo sombra, revise os campos e confirme a execução manual. Nada é enviado ao banco.</p><Link href="/demandas?status=PRONTA_PARA_PROCESSAMENTO" className="secondary-button">Ver demandas prontas</Link></article>
          <article className="integration-card"><span className="automation-eyebrow">RAE</span><h3>Geração de documento</h3><span className="badge">Não implementado</span><p>A geração depende do modelo oficial e das regras de cálculo validadas pela equipe.</p></article>
          <article className="integration-card"><span className="automation-eyebrow">Caixa · SIOPI</span><h3>Execução no portal</h3><span className="badge">Não conectado</span><p>Autenticação, preenchimento e captura do comprovante dependem do fluxo real do portal.</p></article>
          <article className="integration-card"><span className="automation-eyebrow">Banco do Brasil</span><h3>Integração bancária</h3><span className="badge">Não implementada</span><p>É necessário identificar o portal e a operação atendida antes de configurar a conexão.</p></article>
        </div>
      </section>

      {pode(op.papel, "automacao.preparar") ? <LoteSimil demandas={prontas} /> : null}

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

      <section className="panel" id="historico">
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
