import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { exigirOperador } from "@/lib/tenant";

export const dynamic = "force-dynamic";

/** /demandas/codigo/ENG-0012 → a demanda. É o que a busca e a paleta usam. */
export default async function PorCodigo({ params }: { params: Promise<{ codigo: string }> }) {
  const op = await exigirOperador();
  const { codigo } = await params;
  const d = await prisma.demanda.findFirst({ where: { empresaId: op.empresa.id, codigo: codigo.toUpperCase() }, select: { id: true } });
  if (!d) notFound();
  redirect(`/demandas/${d.id}`);
}
