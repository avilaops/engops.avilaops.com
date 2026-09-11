import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import DemandaForm from "@/components/DemandaForm";
import { criarDemandaAction } from "@/app/acoes/demandas";
import { exigirOperador } from "@/lib/tenant";
import { pode } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function NovaDemanda() {
  const op = await exigirOperador();
  if (!pode(op.papel, "demanda.criar")) redirect("/demandas");
  const [membros, clientes] = await Promise.all([
    prisma.membro.findMany({ where: { empresaId: op.empresa.id, ativo: true }, orderBy: { nome: "asc" }, select: { id: true, nome: true } }),
    prisma.cliente.findMany({ where: { empresaId: op.empresa.id }, orderBy: { nome: "asc" }, select: { id: true, nome: true } }),
  ]);
  return (
    <AppShell operador={op} section="nova-demanda">
      <div className="page-header">
        <div>
          <h1>Nova demanda</h1>
          <p>Preencha o que já tem. O que faltar vira pendência, não erro: dá para completar depois.</p>
        </div>
      </div>
      <section className="panel" style={{ maxWidth: 900 }}>
        <DemandaForm acao={criarDemandaAction} membros={membros} clientes={clientes} rotuloBotao="Criar demanda" />
      </section>
    </AppShell>
  );
}
