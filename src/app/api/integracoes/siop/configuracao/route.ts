import { NextResponse, type NextRequest } from "next/server";
import { exigirOperador } from "@/lib/tenant";
import { ambienteSiopSchema } from "@/dominio/siop";
import { configurarSiop, obterConfiguracaoSiop } from "@/servicos/siop";
import { erroHttpSiop, exigirMesmaOrigem, lerCorpoSiop } from "@/integracoes/siop/http";

export async function GET(req: NextRequest) {
  try {
    return NextResponse.json(await obterConfiguracaoSiop(await exigirOperador(), ambienteSiopSchema.parse(req.nextUrl.searchParams.get("ambiente") ?? "HOMOLOGACAO")));
  } catch (erro) { return erroHttpSiop(erro); }
}
export async function POST(req: NextRequest) {
  try {
    exigirMesmaOrigem(req);
    return NextResponse.json(await configurarSiop(await exigirOperador(), await lerCorpoSiop(req)));
  } catch (erro) { return erroHttpSiop(erro); }
}
