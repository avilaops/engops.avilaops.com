import Link from "next/link";
import type { Prioridade, StatusDemanda, TipoServico } from "@prisma/client";
import AppShell from "@/components/AppShell";
import DemandTable from "@/components/DemandTable";
import Kanban from "@/components/Kanban";
import FiltrosDemandas from "@/components/FiltrosDemandas";
import { exigirOperador } from "@/lib/tenant";
import { pode } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { STATUS, STATUS_ABERTOS } from "@/dominio/demandas";
import { listarDemandas, whereDeFiltros, type FiltrosDemanda } from "@/servicos/demandas";

export const dynamic = "force-dynamic";

type SP = { busca?: string; status?: string; prazo?: string; responsavel?: string; prioridade?: string; tipo?: string; visao?: string; abertas?: string };

export default async function Demandas({ searchParams }: { searchParams: Promise<SP> }) {
  const op = await exigirOperador();
  const sp = await searchParams;
  const status = (sp.status?.split(",").filter((s) => STATUS.some(([k]) => k === s)) ?? []) as StatusDemanda[];
  const filtros: FiltrosDemanda = {
    busca: sp.busca,
    status,
    prazo: (["hoje", "amanha", "semana", "atrasadas", "risco"] as const).find((p) => p === sp.prazo),
    responsavelId: sp.responsavel,
    prioridade: sp.prioridade as Prioridade | undefined,
    tipoServico: sp.tipo as TipoServico | undefined,
    abertas: sp.abertas !== "nao",
  };

  const [demandas, membros, contagens] = await Promise.all([
    listarDemandas(op.empresa.id, filtros),
    prisma.membro.findMany({ where: { empresaId: op.empresa.id, ativo: true }, orderBy: { nome: "asc" }, select: { id: true, nome: true } }),
    Promise.all([
      prisma.demanda.count({ where: whereDeFiltros(op.empresa.id, { abertas: true }) }),
      prisma.demanda.count({ where: whereDeFiltros(op.empresa.id, { prazo: "atrasadas" }) }),
      prisma.demanda.count({ where: whereDeFiltros(op.empresa.id, { prazo: "hoje" }) }),
      prisma.pendencia.count({ where: { empresaId: op.empresa.id, resolvidaEm: null, severidade: "BLOQUEIA", demanda: { status: { in: STATUS_ABERTOS } } } }),
      prisma.aprovacao.count({ where: { empresaId: op.empresa.id, status: "PENDENTE" } }),
    ]),
  ]);
  const [abertas, atrasadas, hoje, bloqueios, aprovacoes] = contagens;
  const kanban = sp.visao === "kanban";

  return (
    <AppShell operador={op} section="demandas">
      <div className="page-header">
        <div>
          <h1>Demandas</h1>
          <p>{abertas} em andamento{atrasadas ? `, ${atrasadas} atrasada(s)` : ""}{aprovacoes ? `, ${aprovacoes} aguardando aprovação` : ""}.</p>
        </div>
        <div className="page-actions">
          {pode(op.papel, "demanda.criar") ? <Link href="/demandas/nova" className="primary-button">+ Nova demanda</Link> : null}
          <Link href={kanban ? "/demandas" : "/demandas?visao=kanban"} className="secondary-button">{kanban ? "Ver tabela" : "Ver Kanban"}</Link>
        </div>
      </div>

      <div className="stat-grid" style={{ marginBottom: 16 }}>
        <Link href="/demandas" className="stat"><small>Em andamento</small><strong>{abertas}</strong></Link>
        <Link href="/demandas?prazo=atrasadas" className={atrasadas ? "stat bad" : "stat"}><small>Atrasadas</small><strong>{atrasadas}</strong></Link>
        <Link href="/demandas?prazo=hoje" className={hoje ? "stat warn" : "stat"}><small>Vencem hoje</small><strong>{hoje}</strong></Link>
        <Link href="/pendencias" className={bloqueios ? "stat warn" : "stat"}><small>Bloqueios</small><strong>{bloqueios}</strong></Link>
        <Link href="/aprovacoes" className={aprovacoes ? "stat warn" : "stat"}><small>Para aprovar</small><strong>{aprovacoes}</strong></Link>
      </div>

      <FiltrosDemandas key={sp.busca ?? ""} atual={sp} membros={membros} />

      {kanban ? <Kanban demandas={demandas} /> : <DemandTable demandas={demandas} />}
    </AppShell>
  );
}
