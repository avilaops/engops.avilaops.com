import Link from "next/link";
import { notFound } from "next/navigation";
import AppShell from "@/components/AppShell";
import { ConfiguracaoOperacaoForm, RegistroManualForm } from "@/components/OperacaoForms";
import PaginacaoIntegracao from "@/components/PaginacaoIntegracao";
import { exigirOperador } from "@/lib/tenant";
import { pode } from "@/lib/rbac";
import { dataHora } from "@/lib/formatos";
import { nomeDoStatus } from "@/dominio/demandas";
import { OPERACOES, sistemaPeloSlug } from "@/dominio/operacoes-externas";
import { paginaIntegracao } from "@/dominio/integracoes-telas";
import { painelOperacao } from "@/servicos/operacoes-externas";
import { rotuloDoTipo } from "@/dominio/documentos";

export const dynamic = "force-dynamic";

export default async function Operacao({ params, searchParams }: {
  params: Promise<{ sistema: string }>; searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const op = await exigirOperador();
  const sistema = sistemaPeloSlug((await params).sistema);
  if (!sistema) notFound();
  const query = await searchParams;
  const busca = typeof query.busca === "string" ? query.busca.trim().slice(0, 160) : "";
  const pagina = paginaIntegracao(query.pagina);
  const paginaHistorico = paginaIntegracao(query.historico);
  const meta = OPERACOES[sistema];
  const painel = await painelOperacao(op, sistema, busca, pagina, paginaHistorico);
  const config = painel.configuracao;
  const configurada = sistema !== "BANCO_BRASIL" || Boolean(config?.portalUrl && config.operacao);
  const base = `/automacoes/operacao/${meta.slug}`;
  return <AppShell operador={op} section="automacoes">
    <div className="page-header"><div><p><Link href="/automacoes">Automações e integrações</Link></p><h1>{meta.titulo}</h1><p>{meta.descricao}</p></div>
      {config?.portalUrl ? <a className="secondary-button" href={config.portalUrl} target="_blank" rel="noopener noreferrer">Abrir portal em outra aba</a> : null}
    </div>
    <section className="panel"><div className="panel-title"><h2>Situação da operação</h2><span className="badge badge-warn">Operação manual</span></div>
      <p>{meta.dependencia}</p><p className="muted">O registro guarda o comprovante do trabalho realizado. A etapa da demanda é conferida e alterada separadamente no dossiê.</p>
      <dl className="kv" style={{ marginTop: 12 }}><dt>Unidade</dt><dd>{config?.unidade ?? "Não informada"}</dd><dt>Operação atendida</dt><dd>{config?.operacao ?? "Não informada"}</dd></dl>
      {config?.observacoes ? <p style={{ whiteSpace: "pre-wrap" }}>{config.observacoes}</p> : null}
    </section>
    {pode(op.papel, "empresa.administrar") ? <section className="panel" style={{ marginTop: 16 }}><details><summary>Configurar operação</summary><ConfiguracaoOperacaoForm sistema={sistema} config={config} /></details></section> : null}
    <section className="panel" style={{ marginTop: 16 }}>
      <div className="panel-title"><h2>{sistema === "BANCO_BRASIL" ? "Localizar demanda para vincular" : "Demandas para acompanhamento"}</h2><span>{painel.total} resultado(s)</span></div>
      <form method="get" className="field-grid"><label className="field"><span>Código da demanda ou número da OS</span><input name="busca" maxLength={160} defaultValue={busca} /></label><button className="secondary-button">Buscar demandas</button></form>
      <p className="muted">{busca ? "A busca considera as demandas não arquivadas da empresa, em qualquer etapa." : sistema === "BANCO_BRASIL" ? "Selecione somente as demandas que pertencem à operação do Banco do Brasil." : "A fila exibe as demandas nas etapas anteriores à conclusão deste serviço."}</p>
      {!painel.demandas.length ? <p className="muted">Nenhuma demanda nesta página. Use o código ou a OS para localizar uma demanda em outra etapa.</p> : null}
      <div className="integration-grid" style={{ marginTop: 16 }}>{painel.demandas.map(d => <article key={d.id} className="integration-card">
        <h3>{d.codigo}{d.numeroOs ? ` • OS ${d.numeroOs}` : ""}</h3><span className="badge">{nomeDoStatus(d.status)}</span>
        <p>{[d.municipio, d.uf].filter(Boolean).join(" • ") || "Local não informado"}</p>
        <Link href={`/demandas/${d.id}#documentos`} className="secondary-button">Abrir dossiê e anexar documento</Link>
        {pode(op.papel, "automacao.executar") ? <div style={{ width: "100%", marginTop: 16 }}>
          {!d.documentos.length ? <p>Anexe um documento do tipo {rotuloDoTipo(meta.tipoDocumento)} no dossiê para registrar.</p> : null}
          {!configurada ? <p>O administrador precisa informar o portal e a operação do Banco do Brasil.</p> : null}
          <RegistroManualForm sistema={sistema} demandaId={d.id} documentos={d.documentos.map(doc => ({ id: doc.id, nomeArquivo: doc.nomeArquivo }))} disponivel={d.documentos.length > 0 && configurada} />
        </div> : null}
      </article>)}</div>
      <PaginacaoIntegracao base={base} pagina={pagina} total={painel.total} tamanho={20} parametros={{ busca, historico: String(paginaHistorico) }} rotulo="Paginação de demandas" />
    </section>
    <section className="panel" style={{ marginTop: 16 }}><div className="panel-title"><h2>Histórico de operações</h2><span>{painel.totalHistorico} registro(s)</span></div>
      {!painel.historico.length ? <p className="muted">Nenhuma operação nesta página do histórico.</p> : null}
      {painel.historico.map(x => {
        const dados = x.dados as { origem?: string; documentoId?: string; observacoes?: string };
        const disponivel = dados.documentoId && painel.documentosAtivos.includes(dados.documentoId);
        return <article className="integracao-historico" key={x.id}>
          <strong><Link href={`/demandas/${x.demanda.id}`}>{x.demanda.codigo}</Link> • {dados.origem === "REGISTRO_MANUAL" ? "Registro manual" : "Execução"} • {x.status}</strong>
          <p className="muted">{dataHora(x.iniciadoEm)} • {x.executadoPor ?? "Responsável não informado"}{x.protocolo ? ` • Protocolo ${x.protocolo}` : ""}</p>
          {dados.observacoes ? <p style={{ whiteSpace: "pre-wrap" }}>{dados.observacoes}</p> : null}
          {disponivel ? <a href={`/api/documentos/${dados.documentoId}/arquivo`} target="_blank" rel="noopener noreferrer">Abrir comprovante</a> : dados.documentoId ? <p className="muted">O documento vinculado foi removido do dossiê.</p> : null}
        </article>;
      })}
      <PaginacaoIntegracao base={base} pagina={paginaHistorico} total={painel.totalHistorico} tamanho={20} parametros={{ busca, pagina: String(pagina) }} parametroPagina="historico" rotulo="Paginação do histórico" />
    </section>
    <section className="panel" style={{ marginTop: 16 }}><div className="panel-title"><h2>Documentação de referência</h2></div>
      {sistema === "BANCO_BRASIL" ? <p><a href="https://www.bb.com.br/docs/portal/disec/GUIAR-202400940-VER02.pdf" target="_blank" rel="noopener noreferrer">Guia de engenharia e credenciamento do Banco do Brasil</a> • Consulte o modelo e o MECI correspondentes à atividade da ordem de serviço.</p> : <p><a href="https://www.caixa.gov.br/Downloads/habitacao-documentos-gerais/cartilha-habitacao-PF-construcao-conclusao-reforma-ampliacao-de-unidades-habitacionais.pdf" target="_blank" rel="noopener noreferrer">Orientações de acompanhamento de obras da CAIXA</a> • Confirme com a unidade responsável o modelo e o procedimento aplicáveis à sua modalidade.</p>}
    </section>
  </AppShell>;
}
