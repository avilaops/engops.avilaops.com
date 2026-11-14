import { NextResponse, type NextRequest } from "next/server";
import { exigirOperador } from "@/lib/tenant";
import { ambienteSiopSchema } from "@/dominio/siop";
import { executarConsultaSiop, listarConsultasSiop } from "@/servicos/siop";
import { erroHttpSiop, exigirMesmaOrigem, lerCorpoSiop, paginaSiop } from "@/integracoes/siop/http";

export async function GET(req: NextRequest) {
  try {
    return NextResponse.json(await listarConsultasSiop(await exigirOperador(), ambienteSiopSchema.parse(req.nextUrl.searchParams.get("ambiente") ?? "HOMOLOGACAO"), paginaSiop(req)));
  } catch (erro) { return erroHttpSiop(erro); }
}
export async function POST(req: NextRequest) {
  try {
    exigirMesmaOrigem(req);
    return NextResponse.json(await executarConsultaSiop(await exigirOperador(), await lerCorpoSiop(req)), { status: 201 });
  } catch (erro) { return erroHttpSiop(erro); }
}
