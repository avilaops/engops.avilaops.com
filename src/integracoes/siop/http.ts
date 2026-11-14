import { NextResponse, type NextRequest } from "next/server";
import { ZodError } from "zod";
import { ErroSiop } from "@/integracoes/siop/soap";

/** Escritas autenticadas por cookie exigem origem do próprio site. */
export function exigirMesmaOrigem(req: NextRequest) {
  const origem = req.headers.get("origin");
  const esperada = new URL(process.env.ENGOPS_SITE_URL ?? req.url).origin;
  if (!origem || origem !== esperada) throw new ErroSiop("PROIBIDO", "Origem da requisição não permitida");
}
export async function lerCorpoSiop(req: NextRequest) {
  const texto = await req.text();
  if (Buffer.byteLength(texto) > 8192) throw new ErroSiop("DADOS_INVALIDOS", "Requisição SIOP excede o limite permitido");
  try { return JSON.parse(texto); } catch { throw new ErroSiop("DADOS_INVALIDOS", "JSON inválido"); }
}
export function paginaSiop(req: NextRequest) {
  const valor = req.nextUrl.searchParams.get("pagina") ?? "1";
  if (!/^[1-9]\d{0,5}$/.test(valor)) throw new ErroSiop("DADOS_INVALIDOS", "Página inválida");
  return Number(valor);
}
export function erroHttpSiop(erro: unknown): NextResponse | never {
  if (erro instanceof ZodError) return NextResponse.json({ erro: "Dados SIOP inválidos" }, { status: 422 });
  if (!(erro instanceof ErroSiop)) throw erro; // Preserva redirects de autenticação do Next.
  const status = erro.codigo === "PROIBIDO" ? 403 : erro.codigo === "NAO_ENCONTRADO" ? 404 :
    ["NAO_CONFIGURADO", "CREDENCIAL_AUSENTE"].includes(erro.codigo) ? 409 : erro.codigo === "DADOS_INVALIDOS" ? 422 : 502;
  return NextResponse.json({ erro: erro.message, codigo: erro.codigo }, { status });
}
