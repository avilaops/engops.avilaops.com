import Link from "next/link";
import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import GovCard, { dataGovTela } from "@/components/GovCard";
import GovFiltrosGlobais from "@/components/GovFiltrosGlobais";
import { CriarAlertaGov, DesativarAlertaGov } from "@/components/GovAcoes";
import { exigirOperador } from "@/lib/tenant";
import { pode } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { esquemaBuscaGlobal } from "@/dominio/gov-catalogo";
import { esquemaOportunidade } from "@/integracoes/gov";
import { analisarGlobalGov, buscarGlobalGov, coberturaGov, type GrupoGov } from "@/servicos/gov-busca";
import { listarRegrasGov } from "@/servicos/gov-alertas";

export const dynamic = "force-dynamic";
const secoes = [["base", "Busca global"], ["analise", "Análise consolidada"], ["salvas", "Salvas e acompanhamento"], ["alertas", "Meus alertas"], ["coleta", "Cobertura e atualização"]] as const;
const valor = (v: { toString(): string } | null) => {
  if (v === null) return "Não informado";
  const [inteiro, casas = ""] = v.toString().split(".");
  return `R$ ${inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, ".")},${casas.padEnd(2, "0").slice(0, 2)}`;
};
export default async function CentralGovGlobal({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const op = await exigirOperador();
  const bruto = await searchParams;
  const sp = Object.fromEntries(Object.entries(bruto).filter(([, v]) => typeof v === "string" && v !== "")) as Record<string, string>;
  if (sp.fonte === "salvas") redirect("/gov?visao=salvas");
  if (["abertas", "publicacoes", "planejamento", "compras", "pregoes"].includes(sp.fonte)) redirect(`/gov/fontes?${new URLSearchParams(sp)}`);
  const visao = secoes.some(([id]) => id === sp.visao) ? sp.visao : "base";
  const parsed = esquemaBuscaGlobal.safeParse(sp);
  const filtros = parsed.success ? parsed.data : esquemaBuscaGlobal.parse({});
  const editar = pode(op.papel, "demanda.editar");
  const paginaUrl = (pagina: number) => `/gov?${new URLSearchParams({ ...sp, pagina: String(pagina) })}`;
  const coletas = await coberturaGov();
  const erro = parsed.success ? null : parsed.error.issues.map(i => i.message).join(" • ");
  const base = !erro && ["base", "analise"].includes(visao) ? await buscarGlobalGov(filtros) : null;
  const analise = base && visao === "analise" ? await analisarGlobalGov(filtros) : null;
  const regras = visao === "alertas" ? await listarRegrasGov(op) : [];
  const salvasWhere = { empresaId: op.empresa.id };
  const [salvas, totalSalvas] = visao === "salvas" ? await Promise.all([
    prisma.oportunidadeGovSalva.findMany({ where: salvasWhere, include: { registro: true }, orderBy: [{ atualizadoEm: "desc" }, { id: "desc" }], skip: (filtros.pagina - 1) * 30, take: 30 }), prisma.oportunidadeGovSalva.count({ where: salvasWhere }),
  ]) : [[], 0];
  return <AppShell operador={op} section="gov">
    <div className="page-header"><div><h1>Central GOV</h1><p>Busca e análise de toda a base importada • {op.empresa.nome}</p></div><Link className="secondary-button" href="/gov/fontes">Consultar fontes em tempo real</Link></div>
    <nav className="gov-tabs" aria-label="Central GOV">{secoes.map(([id, titulo]) => <Link key={id} href={`/gov?${new URLSearchParams({ ...sp, visao: id, pagina: "1" })}`} aria-current={visao === id ? "page" : undefined}>{titulo}</Link>)}</nav>
    <section className="panel gov-intro"><p>A busca, os totais e os agrupamentos abrangem todos os registros indexados que correspondem aos filtros • não somente esta página. Não há recorte por atividade da empresa.</p><p className="muted">{coletas.every(c => c.habilitada) && coletas.length ? "Coleta contínua habilitada." : "Ativação da coleta pendente em pelo menos uma origem."} {coletas.filter(c => c.historica).some(c => !c.ciclos) ? "A carga histórica ainda está em formação; consulte a cobertura por origem." : "Confira a cobertura e a atualização de cada origem."} Registros PNCP encontrados em ambas as fontes contam uma única vez.</p></section>
    {["base", "analise"].includes(visao) && <GovFiltrosGlobais filtros={filtros} visao={visao} />}
    {erro && <div role="alert" className="panel">Filtros inválidos • {erro}</div>}
    {base && <><div className="stat-grid" style={{ marginBottom: 16 }}><div className="stat"><small>Registros compatíveis na base</small><strong>{base.total.toLocaleString("pt-BR")}</strong></div>{base.totais.map(t => <div className="stat" key={t.tipo}><small>{t.tipo === "PLANEJAMENTO" ? "Planejamento" : t.tipo === "PREGAO" ? "Pregões legados" : "Contratações"} • {Number(t.quantidade).toLocaleString("pt-BR")}</small><strong style={{ fontSize: 18 }}>{valor(t.valor)}</strong><small>{Number(t.comValor)} com valor • {Number(t.quantidade - t.comValor)} sem valor</small></div>)}</div><p className="muted">Valores estimados conhecidos são apresentados por etapa. Planejamentos e contratações não são somados como despesas independentes.</p></>}
    {base && visao === "base" && <><div className="gov-results">{base.itens.map(i => <GovCard key={i.id} item={esquemaOportunidade.parse(i.dados)} fontes={i.fontes} conferidoEm={i.conferidoEm} editar={editar} />)}</div>{!base.total && <section className="panel"><p>Nenhum registro indexado corresponde a estes filtros. A carga inicial pode estar em andamento; confira a cobertura e a consulta direta às fontes.</p></section>}<Paginacao pagina={filtros.pagina} paginas={base.paginas} href={paginaUrl} />{editar && <section className="panel"><h2>Acompanhar esta busca</h2><p>Notificações internas para novas publicações posteriores à criação da regra e compatíveis com os filtros.</p><CriarAlertaGov filtros={filtros} /></section>}</>}
    {analise && <div className="grid-2">{Object.entries(analise).map(([nome, grupos]) => <Agrupamento key={nome} titulo={({ orgaos: "Órgãos", regioes: "Regiões", categorias: "Categorias do objeto", modalidades: "Modalidades", periodos: "Períodos de publicação" } as Record<string, string>)[nome]} grupos={grupos} />)}</div>}
    {visao === "salvas" && <><section className="panel gov-intro"><p>{totalSalvas} oportunidades salvas nesta empresa. Retratos são atualizados automaticamente quando as fontes respondem. Suas notas e decisões são preservadas. Alertas de alteração e de prazos em até 48 horas chegam às notificações do responsável pelo salvamento.</p></section><div className="gov-results">{salvas.map(s => <GovCard key={s.id} item={esquemaOportunidade.parse(s.dados)} fontes={s.registro?.fontes} conferidoEm={s.registro?.conferidoEm} editar={editar} salva={s} />)}</div><Paginacao pagina={filtros.pagina} paginas={Math.ceil(totalSalvas / 30)} href={paginaUrl} /></>}
    {visao === "alertas" && <><section className="panel"><p>Regras pessoais para {op.empresa.nome}. Alertas são internos ao EngOps; não são enviados emails ou mensagens externas.</p><Link href="/notificacoes">Abrir minhas notificações</Link></section>{regras.map(r => <section className="panel" key={r.id}><h2>{r.nome}</h2><p>Criado em {dataGovTela(r.criadoEm)}</p><pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{JSON.stringify(r.filtros, null, 2)}</pre>{editar && <DesativarAlertaGov id={r.id} />}</section>)}{!regras.length && <p>Crie um alerta a partir dos filtros da busca global.</p>}</>}
    {visao === "coleta" && <div className="gov-results">{coletas.map(c => <section className="panel" key={c.id}><h2>{c.id} • {c.historica ? "Carga histórica" : "Atualização recorrente"}</h2><dl className="kv"><dt>Estado</dt><dd>{c.habilitada ? c.ultimoErro ? "Aguardando nova tentativa" : "Ativa" : "Aguardando ativação"}</dd><dt>Desde</dt><dd>{dataGovTela(c.inicio)}</dd><dt>Cobertura concluída até</dt><dd>{dataGovTela(c.cobertoAte)}</dd><dt>Última página bem-sucedida</dt><dd>{dataGovTela(c.ultimoSucessoEm)}</dd><dt>Páginas processadas</dt><dd>{c.paginas}</dd><dt>Registros recebidos • inclui revisitas</dt><dd>{c.registros}</dd><dt>Ciclos concluídos</dt><dd>{c.ciclos}</dd><dt>Próxima tentativa</dt><dd>{dataGovTela(c.proximaEm)}</dd></dl>{c.ultimoErro && <p role="status">Fonte com falha • {c.ultimoErro}. O cursor e os dados anteriores foram preservados.</p>}</section>)}</div>}
  </AppShell>;
}
function Paginacao({ pagina, paginas, href }: { pagina: number; paginas: number; href: (p: number) => string }) {
  return paginas > 1 ? <nav className="gov-pagination" aria-label="Paginação global">{pagina > 1 && <Link className="secondary-button" href={href(pagina - 1)}>Anterior</Link>}<span>Página {pagina} de {paginas}</span>{pagina < paginas && <Link className="secondary-button" href={href(pagina + 1)}>Próxima</Link>}</nav> : null;
}
function Agrupamento({ titulo, grupos }: { titulo: string; grupos: GrupoGov[] }) {
  const maior = Math.max(...grupos.map(g => Number(g.quantidade)), 1);
  return <section className="panel"><h2>{titulo} • 20 maiores grupos</h2><p className="muted">Quantidade em todas as etapas filtradas. Valor abaixo considera somente contratações, sem somar planejamento ou legado.</p><div className="gov-groups">{grupos.map(g => <div key={g.grupo}><strong>{g.grupo}</strong><p>{Number(g.quantidade).toLocaleString("pt-BR")} registros • {valor(g.valor)}</p><meter min={0} max={maior} value={Number(g.quantidade)} aria-label={`${g.grupo}: ${g.quantidade} registros`} style={{ width: "100%" }} /></div>)}</div></section>;
}
