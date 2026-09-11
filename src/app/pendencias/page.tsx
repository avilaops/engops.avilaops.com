import Link from "next/link";
import AppShell from "@/components/AppShell";
import { EstadoIcone } from "@/components/Badges";
import { exigirOperador } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { STATUS_ABERTOS } from "@/dominio/demandas";

export const dynamic = "force-dynamic";

/** Todas as pendências abertas da empresa, agrupadas por demanda. */
export default async function Pendencias() {
  const op = await exigirOperador();
  const pendencias = await prisma.pendencia.findMany({
    where: { empresaId: op.empresa.id, resolvidaEm: null, demanda: { status: { in: STATUS_ABERTOS } } },
    include: { demanda: { select: { id: true, codigo: true, endereco: true, numero: true, prazo: true } } },
    orderBy: [{ severidade: "asc" }, { criadoEm: "asc" }],
  });
  const porDemanda = new Map<string, { demanda: (typeof pendencias)[number]["demanda"]; itens: typeof pendencias }>();
  for (const p of pendencias) {
    const g = porDemanda.get(p.demandaId) ?? { demanda: p.demanda, itens: [] };
    g.itens.push(p);
    porDemanda.set(p.demandaId, g);
  }
  const bloqueios = pendencias.filter((p) => p.severidade === "BLOQUEIA").length;

  return (
    <AppShell operador={op} section="pendencias">
      <div className="page-header">
        <div><h1>Pendências</h1><p>{pendencias.length} aberta(s) em {porDemanda.size} demanda(s), {bloqueios} bloqueiam automação.</p></div>
      </div>
      {!pendencias.length ? <section className="panel"><p className="muted">Nenhuma pendência aberta.</p></section> : null}
      {[...porDemanda.values()].map(({ demanda, itens }) => (
        <section className="panel" key={demanda.id}>
          <div className="panel-title">
            <h2><Link href={`/demandas/${demanda.id}#pendencias`}>{demanda.codigo}</Link> <span className="muted" style={{ fontWeight: 400 }}>{[demanda.endereco, demanda.numero].filter(Boolean).join(", ")}</span></h2>
            <Link href={`/demandas/${demanda.id}#pendencias`} className="row-action">Abrir</Link>
          </div>
          {itens.map((p) => (
            <div className="issue" key={p.id}>
              <EstadoIcone estado={p.severidade === "BLOQUEIA" ? "BLOQUEADO" : "REVISAR"} />
              <div className="issue-body"><strong>{p.titulo}</strong>{p.detalhe ? <pre>{p.detalhe}</pre> : null}</div>
            </div>
          ))}
        </section>
      ))}
    </AppShell>
  );
}
