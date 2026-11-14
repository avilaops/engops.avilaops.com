import { NextResponse, type NextRequest } from "next/server";
import { exigirOperador } from "@/lib/tenant";
import { obterRetornoSiop } from "@/servicos/siop";
import { erroHttpSiop, paginaSiop } from "@/integracoes/siop/http";

export async function GET(req: NextRequest, contexto: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await contexto.params;
    return NextResponse.json(await obterRetornoSiop(await exigirOperador(), id, paginaSiop(req)));
  } catch (erro) { return erroHttpSiop(erro); }
}
