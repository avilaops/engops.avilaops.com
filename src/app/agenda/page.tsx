import AppShell from "@/components/AppShell";
import { criarCompromissoAction } from "@/app/acoes/agenda";
import Link from "next/link";
import { agruparEventosPorDia, diasDoCalendario, intervaloDoMes, mesAtualSaoPaulo } from "@/dominio/agenda";
import { exigirOperador } from "@/lib/tenant";
import { eventosDaAgenda } from "@/servicos/agenda";
import { exigirModulo } from "@/servicos/modulos";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export default async function AgendaPage({ searchParams }: { searchParams: Promise<{ ano?: string; mes?: string; cliente?: string }> }) {
  const op = await exigirOperador();
  if (!op.modulos.includes("RH") && !op.modulos.includes("SST")) await exigirModulo(op.empresa.id, "RH");
  const sp = await searchParams; const atual = mesAtualSaoPaulo(); const anoInformado = Number(sp.ano); const mesInformado = Number(sp.mes); const ano = anoInformado >= 2000 && anoInformado <= 2200 ? anoInformado : atual.ano; const mes = mesInformado >= 1 && mesInformado <= 12 ? mesInformado : atual.mes;
  const clientes = await prisma.cliente.findMany({ where: { empresaId: op.empresa.id }, orderBy: { nome: "asc" } }); const clienteId = clientes.some(cliente => cliente.id === sp.cliente) ? sp.cliente! : clientes[0]?.id;
  const eventos = await eventosDaAgenda(op.empresa.id, intervaloDoMes(ano, mes), op.modulos, clienteId);
  const eventosPorDia = agruparEventosPorDia(eventos);
  const dias = diasDoCalendario(ano, mes); const anterior = new Date(Date.UTC(ano, mes - 2, 1)); const proximo = new Date(Date.UTC(ano, mes, 1));
  return <AppShell operador={op} section="agenda"><div className="page-header"><div><h1>Agenda</h1><p>Compromissos, treinamentos e vencimentos • {String(mes).padStart(2, "0")}/{ano}</p></div></div>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>{clientes.map(cliente => <Link className={cliente.id === clienteId ? "button" : "button button-secondary"} href={`/agenda?ano=${ano}&mes=${mes}&cliente=${cliente.id}`} key={cliente.id}>{cliente.nome}</Link>)}</div>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}><Link className="button button-secondary" href={`/agenda?ano=${anterior.getUTCFullYear()}&mes=${anterior.getUTCMonth() + 1}${clienteId ? `&cliente=${clienteId}` : ""}`}>Mês anterior</Link><strong>{new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(ano, mes - 1, 1)))}</strong><Link className="button button-secondary" href={`/agenda?ano=${proximo.getUTCFullYear()}&mes=${proximo.getUTCMonth() + 1}${clienteId ? `&cliente=${clienteId}` : ""}`}>Próximo mês</Link></div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 4, marginBottom: 16 }}>{["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map(dia => <strong key={dia} style={{ textAlign: "center", padding: 8 }}>{dia}</strong>)}{dias.map(dia => { const doDia = eventosPorDia.get(dia.data) ?? []; return <section key={dia.data} className="panel" style={{ minHeight: 92, padding: 8, opacity: dia.doMes ? 1 : 0.45 }}><strong>{dia.dia}</strong>{doDia.map(evento => <div key={`${evento.tipo}-${evento.id}`} style={{ fontSize: 11, marginTop: 4 }}><span>{evento.tipo} • </span>{evento.titulo}</div>)}</section>; })}</div>
    {op.modulos.includes("RH") && clienteId ? <section className="panel"><h2>Novo compromisso</h2><form action={criarCompromissoAction} className="form-stack"><input type="hidden" name="clienteId" value={clienteId} /><input name="titulo" placeholder="Título" required /><input name="inicio" type="datetime-local" required /><textarea name="descricao" placeholder="Descrição" /><button className="button">Adicionar à agenda</button></form></section> : null}
    <div className="ios-list" style={{ marginTop: 16 }}>{eventos.length ? eventos.map(e => <div className="ios-row" key={`${e.tipo}-${e.id}`}><span className="ios-row-label"><strong>{e.titulo}</strong><small>{e.tipo} • {e.inicio.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</small></span></div>) : <div className="ios-row"><span className="muted">Nenhum evento neste mês.</span></div>}</div>
  </AppShell>;
}
