import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import ModoAutomacaoForm from "@/components/ModoAutomacaoForm";
import { exigirOperador } from "@/lib/tenant";
import { pode } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { data } from "@/lib/formatos";
import ConfiguracaoSstForm from "@/components/ConfiguracaoSstForm";
import { obterConfiguracaoSst } from "@/servicos/configuracao-sst";

export const dynamic = "force-dynamic";

export default async function Empresa() {
  const op = await exigirOperador();
  if (!pode(op.papel, "empresa.administrar")) redirect("/demandas");
  const e = await prisma.empresa.findUnique({ where: { id: op.empresa.id } });
  if (!e) redirect("/empresas");
  const [demandas, sombraOk, configuracaoSst] = await Promise.all([
    prisma.demanda.count({ where: { empresaId: e.id } }),
    prisma.execucaoExterna.count({ where: { demanda: { empresaId: e.id }, modo: "SOMBRA", status: "CONCLUIDA" } }),
    op.modulos.includes("SST") ? obterConfiguracaoSst(e.id) : Promise.resolve(null),
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
      {op.modulos.includes("SST") ? <section className="panel" style={{ marginTop: 16 }}><div className="panel-title"><h2>Identidade e responsável SST</h2></div><p className="muted" style={{ marginBottom: 16 }}>Defina as marcas e o responsável usados em certificados, listas e ordens de serviço deste tenant.</p><ConfiguracaoSstForm valor={configuracaoSst} /></section> : null}
    </AppShell>
  );
}
