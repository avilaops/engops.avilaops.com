import AppShell from "@/components/AppShell";
import { criarCompromissoAction } from "@/app/acoes/agenda";
import { intervaloDoMes } from "@/dominio/agenda";
import { exigirOperador } from "@/lib/tenant";
import { eventosDaAgenda } from "@/servicos/agenda";
import { exigirModulo } from "@/servicos/modulos";

export const dynamic = "force-dynamic";
export default async function AgendaPage({ searchParams }: { searchParams: Promise<{ ano?: string; mes?: string }> }) {
  const op = await exigirOperador(); await exigirModulo(op.empresa.id, "RH");
  const sp = await searchParams; const hoje = new Date(); const ano = Number(sp.ano) || hoje.getUTCFullYear(); const mes = Number(sp.mes) || hoje.getUTCMonth() + 1;
  const eventos = await eventosDaAgenda(op.empresa.id, intervaloDoMes(ano, mes));
  return <AppShell operador={op} section="agenda"><div className="page-header"><div><h1>Agenda</h1><p>Compromissos, treinamentos e vencimentos • {String(mes).padStart(2, "0")}/{ano}</p></div></div>
    <section className="panel"><h2>Novo compromisso</h2><form action={criarCompromissoAction} className="form-stack"><input name="titulo" placeholder="Título" required /><input name="inicio" type="datetime-local" required /><textarea name="descricao" placeholder="Descrição" /><button className="button">Adicionar à agenda</button></form></section>
    <div className="ios-list" style={{ marginTop: 16 }}>{eventos.length ? eventos.map(e => <div className="ios-row" key={`${e.tipo}-${e.id}`}><span className="ios-row-label"><strong>{e.titulo}</strong><small>{e.tipo} • {e.inicio.toLocaleString("pt-BR")}</small></span></div>) : <div className="ios-row"><span className="muted">Nenhum evento neste mês.</span></div>}</div>
  </AppShell>;
}
