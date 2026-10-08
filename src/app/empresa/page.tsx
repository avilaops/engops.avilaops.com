import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import ModoAutomacaoForm from "@/components/ModoAutomacaoForm";
import { exigirOperador } from "@/lib/tenant";
import { pode } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { data } from "@/lib/formatos";

export const dynamic = "force-dynamic";

export default async function Empresa() {
  const op = await exigirOperador();
  if (!pode(op.papel, "empresa.administrar")) redirect("/demandas");
  const e = await prisma.empresa.findUnique({ where: { id: op.empresa.id } });
  if (!e) redirect("/empresas");
  const [demandas, sombraOk] = await Promise.all([
    prisma.demanda.count({ where: { empresaId: e.id } }),
    prisma.execucaoExterna.count({ where: { demanda: { empresaId: e.id }, modo: "SOMBRA", status: "CONCLUIDA" } }),
  ]);
  return (
    <AppShell operador={op} section="empresa">
      <div className="page-header"><div><h1>{e.nome}</h1><p>Cadastrada em {data(e.criadoEm)} · {demandas} demanda(s).</p></div></div>
      <div className="grid-2">
        <section className="panel">
          <div className="panel-title"><h2>Dados</h2></div>
          <dl className="kv">
            <dt>Nome</dt><dd>{e.nome}</dd>
            <dt>CNPJ</dt><dd>{e.cnpj ?? "—"}</dd>
            <dt>Identificador</dt><dd className="mono">{e.slug}</dd>
            <dt>Próximo código</dt><dd className="mono">ENG-{String(e.proximoCodigo).padStart(4, "0")}</dd>
          </dl>
        </section>
        <section className="panel">
          <div className="panel-title"><h2>Modo de automação</h2></div>
          <ModoAutomacaoForm modo={e.modoAutomacao} sombraOk={sombraOk} dono={op.dono} />
        </section>
      </div>
    </AppShell>
  );
}
