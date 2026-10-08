import Link from "next/link";
import { notFound } from "next/navigation";
import AppShell from "@/components/AppShell";
import { ModoBadge, PrioridadeBadge, Prazo, StatusBadge } from "@/components/Badges";
import ProximaAcao from "@/components/ProximaAcao";
import StatusMenu from "@/components/StatusMenu";
import PainelChecklist from "@/components/PainelChecklist";
import PainelPendencias from "@/components/PainelPendencias";
import PainelDocumentos from "@/components/PainelDocumentos";
import PainelExecucoes from "@/components/PainelExecucoes";
import Historico from "@/components/Historico";
import { exigirOperador } from "@/lib/tenant";
import { pode } from "@/lib/rbac";
import { area, data, mascararDocumento, moeda } from "@/lib/formatos";
import { nomeDoTipo, progressoDoStatus, transicoesDe } from "@/dominio/demandas";
import { obterDemanda } from "@/servicos/demandas";
import { revalidarDemanda } from "@/servicos/validacao";

export const dynamic = "force-dynamic";

export default async function DetalheDemanda({ params }: { params: Promise<{ id: string }> }) {
  const op = await exigirOperador();
  const { id } = await params;
  const d = await obterDemanda(id, op.empresa.id);
  if (!d) notFound();
  const { proxima } = await revalidarDemanda(d.id);
  const bloqueios = d.pendencias.filter((p) => p.severidade === "BLOQUEIA").length;
  const aprovacaoPendente = d.aprovacoes.find((a) => a.status === "PENDENTE") ?? null;
  const jobAtivo = d.jobs.find((j) => ["QUEUED", "RUNNING", "RETRYING"].includes(j.status)) ?? null;

  return (
    <AppShell operador={op} section="demandas">
      <div className="page-header">
        <div>
          <p className="subtle"><Link href="/demandas">Demandas</Link> / {d.codigo}</p>
          <h1>{d.codigo}{d.numeroOs ? <span className="muted" style={{ fontWeight: 400 }}> · OS {d.numeroOs}</span> : null}</h1>
          <p>{[d.endereco, d.numero, d.complemento].filter(Boolean).join(", ") || "Endereço não informado"}{d.municipio ? ` · ${d.municipio}/${d.uf ?? ""}` : ""}</p>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8, alignItems: "center" }}>
            <StatusBadge status={d.status} />
            <PrioridadeBadge prioridade={d.prioridade} />
            <ModoBadge modo={op.empresa.modoAutomacao} />
            <span className="badge">Prazo: <Prazo prazo={d.prazo} /></span>
            <span className="badge">{d.responsavel?.nome ?? "sem responsável"}</span>
          </div>
        </div>
        <div className="page-actions">
          {pode(op.papel, "demanda.editar") ? <Link href={`/demandas/${d.id}/editar`} className="secondary-button">Editar cadastro</Link> : null}
          {pode(op.papel, "demanda.editar") ? <StatusMenu demandaId={d.id} atual={d.status} opcoes={transicoesDe(d.status)} podeArquivar={pode(op.papel, "demanda.arquivar")} /> : null}
        </div>
      </div>

      <div className="progress" style={{ marginBottom: 16 }}><span style={{ width: `${progressoDoStatus(d.status)}%` }} /></div>

      <ProximaAcao
        demandaId={d.id}
        proxima={proxima}
        bloqueios={bloqueios}
        aprovacao={aprovacaoPendente ? { id: aprovacaoPendente.id, tipo: aprovacaoPendente.tipo } : null}
        jobAtivo={jobAtivo ? { id: jobAtivo.id, status: jobAtivo.status } : null}
        modo={op.empresa.modoAutomacao}
        podePreparar={pode(op.papel, "automacao.preparar")}
        podeAprovar={pode(op.papel, "automacao.aprovar")}
      />

      <div className="grid-main" style={{ marginTop: 16 }}>
        <div className="stack">
          <PainelDocumentos demandaId={d.id} documentos={d.documentos} podeEnviar={pode(op.papel, "documento.enviar")} podeRemover={pode(op.papel, "documento.remover")} />
          <PainelExecucoes demandaId={d.id} execucoes={d.execucoes} aprovacoes={d.aprovacoes} modo={op.empresa.modoAutomacao} podeAprovar={pode(op.papel, "automacao.aprovar")} />
          <section className="panel">
            <div className="panel-title"><h2>Cadastro</h2></div>
            <dl className="kv">
              <dt>Serviço</dt><dd>{nomeDoTipo(d.tipoServico)}</dd>
              <dt>Contratante</dt><dd>{d.cliente?.nome ?? "—"}</dd>
              <dt>Entrada</dt><dd>{data(d.dataEntrada)}</dd>
              <dt>Prazo</dt><dd>{data(d.prazo) || "—"}</dd>
              <dt>Matrícula</dt><dd>{d.matricula ?? "—"}{d.cartorio ? ` (${d.cartorio})` : ""}</dd>
              <dt>Área</dt><dd>{area(d.areaM2) || "—"}</dd>
              <dt>Tipo do imóvel</dt><dd>{d.tipoImovel ?? "—"}</dd>
              <dt>CEP / bairro</dt><dd>{[d.cep, d.bairro].filter(Boolean).join(" · ") || "—"}</dd>
              <dt>Proprietário</dt><dd>{d.proprietarioNome ?? "—"}{d.proprietarioDoc ? ` · ${mascararDocumento(d.proprietarioDoc)}` : ""}</dd>
              <dt>Valor de avaliação</dt><dd>{moeda(d.valorAvaliacao) || "—"}</dd>
              <dt>Vistoria</dt><dd>{data(d.dataVistoria) || "—"}</dd>
              <dt>Observações</dt><dd style={{ whiteSpace: "pre-wrap" }}>{d.observacoes ?? "—"}</dd>
            </dl>
          </section>
          <Historico jobs={d.jobs} />
        </div>
        <div className="stack">
          <PainelPendencias demandaId={d.id} pendencias={d.pendencias} podeResolver={pode(op.papel, "pendencia.resolver")} />
          <PainelChecklist itens={d.checklist} />
        </div>
      </div>
    </AppShell>
  );
}
