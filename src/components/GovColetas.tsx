import { ControlarColetaGov } from "@/components/GovAcoes";
import { dataGovTela } from "@/components/GovCard";
import { estadoColetaGov } from "@/dominio/gov-catalogo";
import type { coberturaGov } from "@/servicos/gov-busca";

export default function GovColetas({ coletas, dono, parametros }: { coletas: Awaited<ReturnType<typeof coberturaGov>>; dono: boolean; parametros: Record<string, string> }) {
  return <>
    <section className="panel gov-intro">
      <p>A coleta é compartilhada por todas as empresas da plataforma. Somente o dono da plataforma pode pausar ou retomar um fluxo.</p>
      {dono && <p>Ao pausar, uma página em andamento poderá terminar. A retomada preserva os dados e continua do progresso salvo.</p>}
      <form action="/gov" method="get">{Object.entries({ ...parametros, visao: "coleta" }).map(([nome, valor]) => <input key={nome} type="hidden" name={nome} value={valor} />)}<button className="secondary-button">Atualizar situação</button></form>
    </section>
    <div className="gov-results">{coletas.map(c => <section className="panel" key={c.id}>
      <h2>{c.id} • {c.historica ? "Carga histórica" : "Atualização recorrente"}</h2>
      <dl className="kv">
        <dt>Estado</dt><dd>{estadoColetaGov(c)}</dd>
        <dt>Desde</dt><dd>{dataGovTela(c.inicio)}</dd>
        <dt>Cobertura concluída até</dt><dd>{dataGovTela(c.cobertoAte)}</dd>
        <dt>Última página bem-sucedida</dt><dd>{dataGovTela(c.ultimoSucessoEm)}</dd>
        <dt>Páginas processadas</dt><dd>{c.paginas}</dd>
        <dt>Registros recebidos • inclui revisitas</dt><dd>{c.registros}</dd>
        <dt>Ciclos concluídos</dt><dd>{c.ciclos}</dd>
        <dt>Próxima tentativa</dt><dd>{c.habilitada ? dataGovTela(c.proximaEm) : "Após a retomada"}</dd>
      </dl>
      {c.ultimoErro && <p role="status">Última falha registrada • {c.ultimoErro}. O progresso e os dados anteriores foram preservados.</p>}
      {dono && <ControlarColetaGov id={c.id} habilitada={c.habilitada} />}
    </section>)}</div>
  </>;
}
