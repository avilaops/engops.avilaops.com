import { prisma } from "@/lib/prisma";
import { healthcheckSimil } from "@/automation/adapters/simil";
import { pedirPreparacaoSimil } from "@/servicos/automacoes";
import { revalidarDemanda } from "@/servicos/validacao";

export type ResultadoLote = { id: string; estado: "enfileirada" | "existente" | "bloqueada"; mensagem: string };
export type PreviaLote = { id: string; estado: "pronta" | "bloqueada"; mensagem: string };

export async function prepararLoteSimil(ids: string[], empresaId: string, usuario: string): Promise<ResultadoLote[]> {
  return avaliarLote(ids, empresaId, async (id) => {
    const pedido = await pedirPreparacaoSimil(id, empresaId, usuario);
    return { id, estado: pedido.novo ? "enfileirada" : "existente", mensagem: pedido.novo ? "Preparação enfileirada." : "Já existe uma preparação para este cadastro." };
  });
}

/** Recalcula as pendências, mas não cria jobs nem executa o sistema externo. */
export async function previaLoteSimil(ids: string[], empresaId: string): Promise<PreviaLote[]> {
  return avaliarLote(ids, empresaId, async (id) => ({ id, estado: "pronta", mensagem: "Sem bloqueios na validação atual." }));
}

async function avaliarLote<T extends ResultadoLote | PreviaLote>(
  ids: string[], empresaId: string, aoValidar: (id: string) => Promise<T>,
): Promise<Array<T | { id: string; estado: "bloqueada"; mensagem: string }>> {
  const unicos = [...new Set(ids)];
  if (!unicos.length || unicos.length > 50 || unicos.some((id) => typeof id !== "string" || !id || id.length > 100)) {
    throw new Error("Selecione de 1 a 50 demandas.");
  }
  const empresa = await prisma.empresa.findUniqueOrThrow({ where: { id: empresaId }, select: { modoAutomacao: true } });
  if (empresa.modoAutomacao === "REAL" && !(await healthcheckSimil()).ok) {
    throw new Error("Lote bloqueado: conexão real com o SIMIL indisponível.");
  }
  const resultados: Array<T | { id: string; estado: "bloqueada"; mensagem: string }> = [];
  for (const id of unicos) {
    const demanda = await prisma.demanda.findFirst({ where: { id, empresaId }, select: { status: true } });
    if (!demanda || demanda.status !== "PRONTA_PARA_PROCESSAMENTO") {
      resultados.push({ id, estado: "bloqueada", mensagem: "Demanda indisponível ou não está pronta para processamento." });
      continue;
    }
    try {
      const validacao = await revalidarDemanda(id);
      const bloqueios = validacao.problemas.filter((p) => p.severidade === "BLOQUEIA");
      if (bloqueios.length) {
        resultados.push({ id, estado: "bloqueada", mensagem: `${bloqueios.length} pendência(s): ${bloqueios.map((p) => p.titulo).join("; ")}` });
        continue;
      }
      resultados.push(await aoValidar(id));
    } catch {
      resultados.push({ id, estado: "bloqueada", mensagem: "Não foi possível preparar esta demanda. Consulte a demanda e tente novamente." });
    }
  }
  return resultados;
}
