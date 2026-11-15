import Link from "next/link";
import AppShell from "@/components/AppShell";
import { AnalisarGov, SalvarGov } from "@/components/GovAcoes";
import { exigirOperador } from "@/lib/tenant";
import { pode } from "@/lib/rbac";
import { moeda } from "@/lib/formatos";
import { consultarGov, esquemaFiltrosGov, esquemaOportunidade, filtrarPaginaGov, MODALIDADES, UFS, type OportunidadeGov, type ResultadoGov } from "@/integracoes/gov";
import { listarSalvasGov } from "@/servicos/gov";

export const dynamic = "force-dynamic";
type SP = Record<string, string | string[] | undefined>;
const abas = [["abertas", "Propostas abertas"], ["publicacoes", "Editais publicados"], ["planejamento", "Planejamento anual"], ["compras", "Pregões • Compras.gov.br"], ["pregoes", "Pregões • legado"], ["salvas", "Salvas da empresa"]] as const;
function dia(v: string | null) {
  if (!v || !Number.isFinite(new Date(v).getTime())) return "Não informado";
  // Datas sem fuso são civis: não converter para o dia anterior no Brasil.
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}${v.includes("T") ? ` • ${v.slice(11, 16)}` : ""}` : v;
}

export default async function CentralGov({ searchParams }: { searchParams: Promise<SP> }) {
  const op = await exigirOperador();
  const brutos = await searchParams;
  const sp: Record<string, string> = {};
  for (const [chave, valor] of Object.entries(brutos)) if (typeof valor === "string" && valor !== "") sp[chave] = valor;
  const fonte = abas.some(([id]) => id === sp.fonte) ? sp.fonte : "abertas";
  const salvas = fonte === "salvas";
  const planejamento = fonte === "planejamento";
  const pregoes = fonte === "pregoes";
  const compras = fonte === "compras";
  const agora = new Date();
  const hoje = agora.toISOString().slice(0, 10);
  const inicio = sp.inicio ?? new Date(agora.getTime() - 7 * 86400000).toISOString().slice(0, 10);
  const fim = sp.fim ?? (fonte === "abertas" ? `${agora.getFullYear() + 1}-12-31` : hoje);
  const entrada = { ...sp, fonte: salvas ? "abertas" : fonte, inicio, fim, modalidade: fonte === "publicacoes" ? sp.modalidade ?? "6" : sp.modalidade };
  const validacao = esquemaFiltrosGov.safeParse(entrada);
  let erro: string | null = validacao.success ? null : validacao.error.issues.map(i => i.message).join(" • ");
  let resultado: ResultadoGov | null = null;
  let itens: OportunidadeGov[] = [];
  const registrosSalvos = salvas ? await listarSalvasGov(op) : [];
  if (salvas) {
    itens = registrosSalvos.flatMap(s => { const v = esquemaOportunidade.safeParse(s.dados); return v.success ? [v.data] : []; });
  } else if (validacao.success) {
    try { resultado = await consultarGov(validacao.data); itens = resultado.itens; }
    catch (e) { erro = e instanceof Error ? e.message : "Não foi possível consultar a fonte oficial."; }
  }
  const visiveis = validacao.success ? filtrarPaginaGov(itens, validacao.data) : [];
  const editar = pode(op.papel, "demanda.editar");
  const paginaUrl = (pagina: number) => { const q = new URLSearchParams({ ...sp, fonte, inicio, fim, pagina: String(pagina) }); return `/gov?${q}`; };

  return <AppShell operador={op} section="gov">
    <div className="page-header"><div><h1>Central GOV</h1><p>Demandas públicas de todas as áreas • {op.empresa.nome}</p></div>
      <a className="secondary-button" href="https://auth.avilaops.com/conta" target="_blank" rel="noopener noreferrer">Minha conta e acesso gov.br</a>
    </div>
    <nav aria-label="Fontes de demandas públicas" className="gov-tabs">{abas.map(([id, nome]) => <Link key={id} href={`/gov?fonte=${id}`} aria-current={fonte === id ? "page" : undefined}>{nome}</Link>)}</nav>
    <section className="panel gov-intro">
      <p>{salvas ? "Oportunidades e notas são compartilhadas somente nesta empresa. O retrato salvo não é atualizado automaticamente; confira o edital oficial antes de decidir." : planejamento ? "Intenções de contratação dos órgãos • cada plano contém diversos itens. Demanda planejada não significa edital ou proposta aberta." : pregoes ? "Histórico de pregões do módulo legado do Compras.gov.br. Confira a situação e as datas oficiais antes de participar." : compras ? "Pregões publicados no Compras.gov.br pela Lei 14.133. O prazo pode estar encerrado; confira a situação no portal oficial. A mesma contratação pode aparecer no PNCP." : fonte === "abertas" ? "Contratações informadas pelo PNCP como recebendo propostas, de todas as modalidades. Confira abertura, encerramento e situação no edital oficial." : "Publicações do PNCP no período e na modalidade selecionados. Publicação não significa que o prazo de propostas ainda esteja aberto."}</p>
      <p className="muted">Consultas públicas não exigem login gov.br. Quando necessário, a identificação gov.br é gerenciada no Auth • ela não concede automaticamente acesso a APIs restritas.</p>
    </section>
    <form action="/gov" method="get" className="panel gov-filters">
      <input type="hidden" name="fonte" value={fonte} />
      {!salvas && <>
        <label>Página na fonte<input name="pagina" type="number" min="1" max="100000" defaultValue={sp.pagina ?? "1"} /></label>
        {fonte !== "abertas" && <label>{planejamento ? "Atualizações a partir de" : "Publicação a partir de"}<input name="inicio" type="date" defaultValue={inicio} required /></label>}
        <label>{fonte === "abertas" ? "Encerramento até" : "Até"}<input name="fim" type="date" defaultValue={fim} required /></label>
        {!pregoes && <label>CNPJ do órgão comprador<input name="cnpj" defaultValue={sp.cnpj} inputMode="numeric" pattern="[0-9]{14}" maxLength={14} placeholder="14 dígitos • opcional" /></label>}
        {!planejamento && !pregoes && <>
          <label>UF<select name="uf" defaultValue={sp.uf ?? ""}><option value="">Todo o Brasil</option>{UFS.map(uf => <option key={uf}>{uf}</option>)}</select></label>
          {!compras && <label>Modalidade<select name="modalidade" defaultValue={fonte === "publicacoes" ? sp.modalidade ?? "6" : sp.modalidade ?? ""}>
            {fonte !== "publicacoes" && <option value="">Todas as modalidades</option>}{MODALIDADES.map(([id, nome]) => <option key={id} value={id}>{nome}</option>)}
          </select></label>}
        </>}
      </>}
      <label>Texto do objeto{compras ? " • na fonte" : " • nesta página"}<input name="busca" defaultValue={sp.busca} maxLength={200} placeholder="Ex.: manutenção, software, transporte" /></label>
      <label>Nome do órgão • nesta página<input name="orgao" defaultValue={sp.orgao} maxLength={200} /></label>
      <label>Valor mínimo • nesta página<input type="number" name="minimo" min="0" step="0.01" defaultValue={sp.minimo} /></label>
      <label>Valor máximo • nesta página<input type="number" name="maximo" min="0" step="0.01" defaultValue={sp.maximo} /></label>
      <div className="page-actions"><button className="primary-button">Consultar</button><Link className="secondary-button" href={`/gov?fonte=${fonte}`}>Limpar filtros</Link></div>
    </form>
    {erro && <div role="alert" className="panel gov-error"><strong>Consulta não concluída</strong><p>{erro}</p><p>Nenhum resultado foi substituído por dados de exemplo. Ajuste os filtros ou tente novamente.</p><Link href={compras ? "/gov?fonte=abertas" : "/gov?fonte=compras"} className="secondary-button">Consultar outra fonte oficial</Link></div>}
    {resultado && <section className="panel gov-coverage">
      <strong>{resultado.total.toLocaleString("pt-BR")} {resultado.unidadePaginacao} informados pela fonte • página {resultado.pagina} de {resultado.paginas || 1}</strong>
      <p>{visiveis.length} itens exibidos de {itens.length} recebidos nesta página{planejamento ? " de planos" : ""}. {compras ? "Texto do objeto também é consultado na fonte. Nome do órgão e valores filtram esta página." : "Texto, nome do órgão e valores filtram somente os itens recebidos; não representam uma busca nacional completa."}</p>
      <p className="muted">Consultado em {new Date(resultado.consultadoEm).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })} • <a href={resultado.endpoint} target="_blank" rel="noopener noreferrer">Requisição oficial</a></p>
    </section>}
    {salvas && <p>{registrosSalvos.length} salvas carregadas • limite de 500 mais recentes • {visiveis.length} exibidas pelos filtros.</p>}
    {!erro && visiveis.length === 0 && <section className="panel"><p>{itens.length ? "Nenhum item desta página corresponde aos filtros locais. Navegue pelas próximas páginas ou amplie os filtros." : "Nenhum registro retornado para esta consulta."}</p></section>}
    <div className="gov-results">{visiveis.map(item => {
      const salva = registrosSalvos.find(s => s.fonte === item.fonte && s.externoId === item.id);
      return <article className="panel gov-card" key={`${item.fonte}:${item.id}`}>
        <div className="gov-card-top"><span>{item.fonte} • {item.tipo === "PLANEJAMENTO" ? `Planejamento ${item.ano}` : item.modalidade ?? "Contratação"}</span><strong>{item.valor === null ? "Valor não informado" : moeda(item.valor)}</strong></div>
        <h2>{item.objeto}</h2><p>{item.orgao}{item.municipio ? ` • ${item.municipio}` : ""}{item.uf ? ` • ${item.uf}` : ""}</p>
        <div className="gov-card-dates"><span>{item.tipo === "PLANEJAMENTO" ? "Data desejada" : "Prazo informado"} • {dia(item.prazo)}</span><span>Publicação • {dia(item.publicado)}</span></div>
        <details><summary>Detalhes e origem</summary><dl className="kv">
          <dt>Identificação oficial</dt><dd className="mono">{item.id}</dd><dt>CNPJ do órgão</dt><dd>{item.cnpj ?? "Não informado"}</dd>
          <dt>Situação oficial</dt><dd>{item.situacao ?? "Não informada"}</dd><dt>Atualização na fonte</dt><dd>{dia(item.atualizado)}</dd>
        </dl></details>
        <div className="gov-card-actions"><a className="secondary-button" href={item.url} target="_blank" rel="noopener noreferrer">{item.fonte === "COMPRAS" ? "Consultar registro oficial" : "Abrir portal oficial e documentos"}</a>{editar && !salvas && <SalvarGov dados={item} />}</div>
        {salva && (editar ? <AnalisarGov id={salva.id} notas={salva.notas} situacao={salva.situacao} /> : <p>Análise • {salva.situacao}<br />{salva.notas}</p>)}
      </article>;
    })}</div>
    {resultado && resultado.paginas > 1 && <nav className="gov-pagination" aria-label="Paginação de resultados">
      {resultado.pagina > 1 && <Link className="secondary-button" href={paginaUrl(resultado.pagina - 1)}>Página anterior</Link>}
      <span>Página {resultado.pagina} de {resultado.paginas}</span>
      {resultado.pagina < resultado.paginas && <Link className="secondary-button" href={paginaUrl(resultado.pagina + 1)}>Próxima página</Link>}
    </nav>}
  </AppShell>;
}
