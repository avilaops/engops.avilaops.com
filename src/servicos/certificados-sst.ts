export function proximaVersaoCertificado(atual: { versao: number } | null): number {
  return (atual?.versao ?? 0) + 1;
}

function conflitoConcorrente(erro: unknown): boolean {
  const codigo = typeof erro === "object" && erro !== null && "code" in erro ? String(erro.code) : "";
  return codigo === "P2034" || codigo === "P2002";
}

export async function executarComRetryConcorrente<T>(operacao: () => Promise<T>, tentativas = 3): Promise<T> {
  for (let tentativa = 1; tentativa <= tentativas; tentativa += 1) {
    try {
      return await operacao();
    } catch (erro) {
      if (!conflitoConcorrente(erro) || tentativa === tentativas) throw erro;
    }
  }
  throw new Error("Não foi possível concluir a emissão concorrente.");
}
