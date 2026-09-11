import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { criarDemanda, esquemaDemanda } from "@/servicos/demandas";

/**
 * Entrada de demanda por serviço (n8n, CRM, e-mail futuramente).
 * Autentica por `x-service-key` = ENGOPS_SERVICE_TOKEN e exige o slug da
 * empresa no corpo: serviço nunca escolhe empresa por adivinhação.
 */
function autorizado(req: NextRequest): boolean {
  const esperado = process.env.ENGOPS_SERVICE_TOKEN;
  const recebido = req.headers.get("x-service-key") ?? "";
  if (!esperado || !recebido || esperado.length !== recebido.length) return false;
  return timingSafeEqual(Buffer.from(esperado), Buffer.from(recebido));
}

export async function POST(req: NextRequest) {
  if (!autorizado(req)) return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  const corpo = await req.json().catch(() => null);
  if (!corpo || typeof corpo !== "object") return NextResponse.json({ erro: "corpo inválido" }, { status: 400 });
  const { empresa, origem, ...resto } = corpo as Record<string, unknown>;
  const e = typeof empresa === "string" ? await prisma.empresa.findUnique({ where: { slug: empresa } }) : null;
  if (!e || !e.ativo) return NextResponse.json({ erro: "empresa desconhecida" }, { status: 404 });
  const dados = esquemaDemanda.safeParse(resto);
  if (!dados.success) return NextResponse.json({ erro: "dados inválidos", detalhes: dados.error.issues }, { status: 422 });
  const d = await criarDemanda(e.id, `servico:${typeof origem === "string" ? origem : "desconhecido"}`, dados.data);
  return NextResponse.json({ id: d.id, codigo: d.codigo, url: `${process.env.ENGOPS_SITE_URL ?? ""}/demandas/${d.id}` }, { status: 201 });
}
