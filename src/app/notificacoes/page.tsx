import Link from "next/link";
import AppShell from "@/components/AppShell";
import MarcarNotificacaoLida from "@/components/MarcarNotificacaoLida";
import { exigirOperador } from "@/lib/tenant";
import { dataHora } from "@/lib/formatos";
import { listarNotificacoes } from "@/servicos/notificacoes";

export const dynamic = "force-dynamic";

export default async function Notificacoes({ searchParams }: { searchParams: Promise<{ pagina?: string; filtro?: string }> }) {
  const op = await exigirOperador();
  const sp = await searchParams;
  const numero = Number(sp.pagina ?? 1);
  const pagina = Number.isSafeInteger(numero) && numero > 0 && numero <= 100000 ? numero : 1;
  const apenasNaoLidas = sp.filtro !== "todas";
  const { itens, total, naoLidas } = await listarNotificacoes(op.empresa.id, op.email, pagina, apenasNaoLidas);
  const href = (p: number) => `/notificacoes?pagina=${p}&filtro=${apenasNaoLidas ? "nao-lidas" : "todas"}`;
  return <AppShell operador={op} section="notificacoes">
    <div className="page-header">
      <div><h1>Notificações</h1><p>{naoLidas} não lida(s) · Avisos para você em {op.empresa.nome}.</p></div>
      <Link className="secondary-button" href={apenasNaoLidas ? "/notificacoes?filtro=todas" : "/notificacoes"}>{apenasNaoLidas ? "Ver todas" : "Somente não lidas"}</Link>
    </div>
    <p className="muted">Avisos de novas aprovações e falhas de automação. Atualizados ao abrir esta página.</p>
    {!itens.length ? <section className="panel"><p>Nenhuma notificação nesta página.</p></section> : null}
    {itens.map((n) => <article key={n.id} className="panel">
      <div className="panel-title"><h2>{n.titulo}</h2><span className={n.lidaEm ? "badge" : "badge badge-accent"}>{n.lidaEm ? "Lida" : "Não lida"}</span></div>
      <p>{n.corpo}</p><p className="muted">{dataHora(n.criadoEm)}</p>
      <div className="page-actions">
        {n.link && /^\/(?:aprovacoes|automacoes)(?:\/[A-Za-z0-9_-]+)?$/.test(n.link) ? <Link href={n.link} className="secondary-button">Abrir detalhes</Link> : null}
        {!n.lidaEm ? <MarcarNotificacaoLida id={n.id} /> : null}
      </div>
    </article>)}
    <nav className="page-actions" aria-label="Páginas de notificações">
      {pagina > 1 ? <Link href={href(pagina - 1)} className="secondary-button">Anterior</Link> : null}
      <span>Página {pagina} · {total} aviso(s)</span>
      {pagina * 30 < total ? <Link href={href(pagina + 1)} className="secondary-button">Próxima</Link> : null}
    </nav>
  </AppShell>;
}
