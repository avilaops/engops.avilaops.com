import Link from "next/link";
import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import { exigirOperador } from "@/lib/tenant";
import { pode } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { dataHora } from "@/lib/formatos";

export const dynamic = "force-dynamic";

export default async function Auditoria({ searchParams }: { searchParams: Promise<{ objeto?: string; usuario?: string; acao?: string }> }) {
  const op = await exigirOperador();
  if (!pode(op.papel, "empresa.administrar")) redirect("/demandas");
  const sp = await searchParams;
  const registros = await prisma.auditoria.findMany({
    where: { empresaId: op.empresa.id, ...(sp.objeto ? { objetoId: sp.objeto } : {}), ...(sp.usuario ? { usuario: { contains: sp.usuario } } : {}), ...(sp.acao ? { acao: { startsWith: sp.acao } } : {}) },
    orderBy: { criadoEm: "desc" },
    take: 200,
  });
  const demandas = await prisma.demanda.findMany({ where: { id: { in: registros.filter((r) => r.objetoTipo === "Demanda").map((r) => r.objetoId) } }, select: { id: true, codigo: true } });
  const codigo = new Map(demandas.map((d) => [d.id, d.codigo]));

  return (
    <AppShell operador={op} section="auditoria">
      <div className="page-header"><div><h1>Auditoria</h1><p>Quem fez o quê, quando, com o valor anterior e o novo. Últimos 200 registros.</p></div></div>
      <form className="filters" method="get">
        <input className="search" name="usuario" placeholder="usuário" defaultValue={sp.usuario ?? ""} />
        <input className="search" name="acao" placeholder="ação (ex.: demanda., documento.)" defaultValue={sp.acao ?? ""} />
        <button type="submit" className="secondary-button">Filtrar</button>
      </form>
      <div className="ios-list">
        {!registros.length ? <div className="ios-row"><span className="muted">Nenhum registro.</span></div> : null}
        {registros.map((r) => (
          <div className="ios-row" key={r.id} style={{ alignItems: "flex-start" }}>
            <span className="ios-row-label">
              <strong><span className="mono">{r.acao}</span> · {r.objetoTipo === "Demanda" && codigo.get(r.objetoId) ? <Link href={`/demandas/${r.objetoId}`}>{codigo.get(r.objetoId)}</Link> : <span className="mono subtle">{r.objetoTipo} {r.objetoId.slice(-6)}</span>}</strong>
              <small>{r.usuario} · {dataHora(r.criadoEm)} · {r.origem}</small>
              {r.antes || r.depois ? (
                <pre className="mono" style={{ whiteSpace: "pre-wrap", fontSize: "0.72rem", color: "var(--muted)", margin: "4px 0 0" }}>
                  {r.antes ? `antes: ${JSON.stringify(r.antes)}\n` : ""}{r.depois ? `depois: ${JSON.stringify(r.depois)}` : ""}
                </pre>
              ) : null}
            </span>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
