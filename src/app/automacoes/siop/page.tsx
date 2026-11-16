import Link from "next/link";
import AppShell from "@/components/AppShell";
import { ConfiguracaoSiopForm, ConsultaSiopForm } from "@/components/SiopForms";
import PaginacaoIntegracao from "@/components/PaginacaoIntegracao";
import { exigirOperador } from "@/lib/tenant";
import { pode } from "@/lib/rbac";
import { dataHora } from "@/lib/formatos";
import { ambienteSiopSchema } from "@/dominio/siop";
import { paginaIntegracao, STATUS_CONSULTA_SIOP } from "@/dominio/integracoes-telas";
import { listarConsultasSiop, obterConfiguracaoSiop } from "@/servicos/siop";

export const dynamic = "force-dynamic";

export default async function Siop({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const op = await exigirOperador();
  const params = await searchParams;
  const ambiente = ambienteSiopSchema.catch("HOMOLOGACAO").parse(params.ambiente);
  const pagina = paginaIntegracao(params.pagina);
  const [config, historico] = await Promise.all([obterConfiguracaoSiop(op, ambiente), listarConsultasSiop(op, ambiente, pagina)]);
  const nomeAmbiente = ambiente === "HOMOLOGACAO" ? "Homologação" : "Produção";
  return <AppShell operador={op} section="automacoes">
    <div className="page-header"><div><p><Link href="/automacoes">Automações e integrações</Link></p><h1>SIOP • Execução orçamentária</h1><p>Consulte a execução PAC e acompanhe o histórico da empresa. Este serviço é independente do SIOPI da CAIXA.</p></div></div>
    <section className="panel">
      <form method="get" className="field-grid"><label className="field"><span>Ambiente consultado</span><select name="ambiente" defaultValue={ambiente}><option value="HOMOLOGACAO">Homologação</option><option value="PRODUCAO">Produção</option></select></label><button className="secondary-button">Abrir ambiente</button></form>
      <p className="muted" style={{ marginTop: 12 }}>{nomeAmbiente} • {config.habilitada && config.credencialDisponivel ? "Consultas habilitadas" : "Consultas desabilitadas"}</p>
    </section>
    <div className="grid-2" style={{ marginTop: 16 }}>
      <section className="panel"><div className="panel-title"><h2>Nova consulta</h2></div>
        {pode(op.papel, "automacao.executar") ? <ConsultaSiopForm key={ambiente} ambiente={ambiente} disponivel={config.habilitada && config.credencialDisponivel} /> : <p className="muted">Seu perfil permite consultar o histórico. Novas consultas são executadas por operadores autorizados.</p>}
      </section>
      <section className="panel"><div className="panel-title"><h2>Configuração • {nomeAmbiente}</h2></div>
        {pode(op.papel, "empresa.administrar") ? <ConfiguracaoSiopForm key={ambiente} config={config} podeVincularReferencia={op.dono} /> : <p className="muted">A configuração é administrada pelo responsável da empresa.</p>}
      </section>
    </div>
    <section className="panel" style={{ marginTop: 16 }}><div className="panel-title"><h2>Histórico de consultas</h2><span>{historico.total} consulta(s)</span></div>
      {!historico.consultas.length ? <p className="muted">Nenhuma consulta nesta página do ambiente selecionado.</p> : null}
      <div className="ios-list">{historico.consultas.map(c => <Link className="ios-row" href={`/automacoes/siop/${c.id}`} key={c.id}>
        <span className="ios-row-label"><strong>Exercício {c.anoExercicio} • {STATUS_CONSULTA_SIOP[c.status]}</strong><small>{dataHora(c.criadoEm)} • {c.solicitadoPor} • {c.retorno?._count.execucoes ?? 0} registro(s)</small></span><span aria-hidden="true">→</span>
      </Link>)}</div>
      <PaginacaoIntegracao base="/automacoes/siop" pagina={pagina} total={historico.total} tamanho={50} parametros={{ ambiente }} />
    </section>
    <p className="muted" style={{ marginTop: 16 }}><a href="https://www1.siop.planejamento.gov.br/siopdoc/doku.php/webservices:manual-wsexecucaoorcamentaria" target="_blank" rel="noopener noreferrer">Manual oficial do SIOP • Execução orçamentária</a></p>
  </AppShell>;
}
