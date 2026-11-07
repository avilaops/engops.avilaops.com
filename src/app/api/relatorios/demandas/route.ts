import { exigirOperador } from "@/lib/tenant";
import { pode } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { auditar } from "@/lib/auditoria";
import { gerarCsv } from "@/dominio/csv";
import { nomeDoStatus, nomeDoTipo } from "@/dominio/demandas";

export const dynamic = "force-dynamic";

export async function GET() {
  const op = await exigirOperador();
  if (!pode(op.papel, "relatorio.ver")) return new Response("Sem permissão.", { status: 403 });
  const demandas = await prisma.demanda.findMany({
    where: { empresaId: op.empresa.id },
    select: { codigo: true, numeroOs: true, tipoServico: true, status: true, municipio: true, uf: true, prazo: true, responsavel: { select: { nome: true } } },
    orderBy: [{ criadoEm: "asc" }, { id: "asc" }],
    take: 10001,
  });
  if (demandas.length > 10000) return new Response("Exportação limitada a 10.000 demandas. Nenhum arquivo parcial foi gerado.", { status: 422 });
  const csv = gerarCsv([
    ["Código", "OS", "Serviço", "Status", "Município", "UF", "Prazo (ISO 8601)", "Responsável"],
    ...demandas.map((d) => [d.codigo, d.numeroOs, nomeDoTipo(d.tipoServico), nomeDoStatus(d.status), d.municipio, d.uf, d.prazo?.toISOString() ?? "", d.responsavel?.nome ?? ""]),
  ]);
  await auditar({ empresaId: op.empresa.id, usuario: op.email, acao: "demandas.exportadas", objetoTipo: "Empresa", objetoId: op.empresa.id, metadados: { formato: "csv", quantidade: demandas.length } });
  return new Response(csv, { headers: {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": 'attachment; filename="demandas.csv"',
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  } });
}
