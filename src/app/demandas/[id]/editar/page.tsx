import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import DemandaForm from "@/components/DemandaForm";
import { atualizarDemandaAction } from "@/app/acoes/demandas";
import { exigirOperador } from "@/lib/tenant";
import { pode } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function EditarDemanda({ params }: { params: Promise<{ id: string }> }) {
  const op = await exigirOperador();
  if (!pode(op.papel, "demanda.editar")) redirect("/demandas");
  const { id } = await params;
  const [d, membros, clientes] = await Promise.all([
    prisma.demanda.findFirst({ where: { id, empresaId: op.empresa.id } }),
    prisma.membro.findMany({ where: { empresaId: op.empresa.id, ativo: true }, orderBy: { nome: "asc" }, select: { id: true, nome: true } }),
    prisma.cliente.findMany({ where: { empresaId: op.empresa.id }, orderBy: { nome: "asc" }, select: { id: true, nome: true } }),
  ]);
  if (!d) notFound();
  const acao = atualizarDemandaAction.bind(null, d.id);
  return (
    <AppShell operador={op} section="demandas">
      <div className="page-header">
        <div>
          <p className="subtle"><Link href="/demandas">Demandas</Link> / <Link href={`/demandas/${d.id}`}>{d.codigo}</Link> / editar</p>
          <h1>Editar {d.codigo}</h1>
          <p>Toda alteração fica na auditoria com o valor anterior e o novo.</p>
        </div>
        <div className="page-actions"><Link href={`/demandas/${d.id}`} className="secondary-button">Voltar à demanda</Link></div>
      </div>
      <section className="panel" style={{ maxWidth: 900 }}>
        <DemandaForm
          acao={acao}
          demanda={{ ...d, areaM2: d.areaM2 === null ? null : Number(d.areaM2), valorAvaliacao: d.valorAvaliacao === null ? null : Number(d.valorAvaliacao) }}
          membros={membros}
          clientes={clientes}
          rotuloBotao="Salvar alterações"
        />
      </section>
    </AppShell>
  );
}
