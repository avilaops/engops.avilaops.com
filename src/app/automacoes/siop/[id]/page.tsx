import Link from "next/link";
import { notFound } from "next/navigation";
import AppShell from "@/components/AppShell";
import PaginacaoIntegracao from "@/components/PaginacaoIntegracao";
import { exigirOperador } from "@/lib/tenant";
import { dataHora } from "@/lib/formatos";
import { CAMPOS_DECIMAIS } from "@/dominio/siop";
import { CAMPOS_SIOP_TELA, formatarValorSiop, paginaIntegracao, ROTULOS_SIOP, STATUS_CONSULTA_SIOP } from "@/dominio/integracoes-telas";
import { obterRetornoSiop } from "@/servicos/siop";
import { ErroSiop } from "@/integracoes/siop/soap";

export const dynamic = "force-dynamic";

export default async function RetornoSiop({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ pagina?: string }> }) {
  const op = await exigirOperador();
  const { id } = await params;
  const pagina = paginaIntegracao((await searchParams).pagina);
  const dados = await obterRetornoSiop(op, id, pagina).catch(erro => {
    if (erro instanceof ErroSiop && erro.codigo === "NAO_ENCONTRADO") notFound();
    throw erro;
  });
  const { consulta } = dados;
  const mensagens = Array.isArray(consulta.retorno?.mensagensErro) ? consulta.retorno.mensagensErro : [];
  return <AppShell operador={op} section="automacoes">
    <div className="page-header"><div><p><Link href={`/automacoes/siop?ambiente=${consulta.ambiente}`}>SIOP • Histórico</Link></p><h1>Execução PAC • {consulta.anoExercicio}</h1><p>{consulta.ambiente === "HOMOLOGACAO" ? "Homologação" : "Produção"} • {STATUS_CONSULTA_SIOP[consulta.status]}</p></div></div>
    <section className="panel"><dl className="kv"><dt>Solicitado em</dt><dd>{dataHora(consulta.criadoEm)}</dd><dt>Solicitado por</dt><dd>{consulta.solicitadoPor}</dd><dt>Concluído em</dt><dd>{dataHora(consulta.terminadoEm) || (consulta.status === "PENDENTE" ? "Aguardando conclusão" : "Não informado")}</dd><dt>Registros recebidos</dt><dd>{dados.total}</dd></dl>
      {consulta.erroCodigo ? <p className="form-error" role="alert">A consulta falhou • {consulta.erroCodigo}. Confira a configuração antes de tentar novamente.</p> : null}
      {mensagens.length ? <div role="status"><h2>Mensagens do SIOP</h2><ul>{mensagens.map((mensagem, i) => <li key={i}>{typeof mensagem === "string" ? mensagem : "Mensagem sem conteúdo informada pelo serviço"}</li>)}</ul></div> : null}
      {consulta.status === "PENDENTE" ? <p className="muted">A consulta está em andamento. Atualize a página para conferir o retorno.</p> : null}
      {!dados.total && consulta.status === "CONCLUIDA" ? <p className="muted">O SIOP concluiu a consulta sem registros para este exercício.</p> : null}
    </section>
    <div className="stack" style={{ marginTop: 16 }}>{dados.execucoes.map((execucao, indice) => <article key={indice} className="panel">
      <div className="panel-title"><h2>Registro {(pagina - 1) * 100 + indice + 1} • {String(execucao.tituloacao ?? execucao.acao ?? "Execução orçamentária")}</h2></div>
      <dl className="kv">{CAMPOS_SIOP_TELA.map(campo => <div key={campo} className="siop-campo"><dt>{ROTULOS_SIOP[campo as keyof typeof ROTULOS_SIOP]}</dt><dd>{(CAMPOS_DECIMAIS as readonly string[]).includes(campo) ? formatarValorSiop(execucao[campo]) : String(execucao[campo] ?? "Não informado")}</dd></div>)}</dl>
    </article>)}</div>
    <PaginacaoIntegracao base={`/automacoes/siop/${id}`} pagina={pagina} total={dados.total} tamanho={100} />
  </AppShell>;
}
