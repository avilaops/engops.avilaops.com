import { z } from "zod";

const urlImagem = z.preprocess(
  valor => valor === null || valor === undefined || String(valor).trim() === "" ? null : String(valor).trim(),
  z.union([z.null(), z.string().refine(valor => {
    const interno = valor.startsWith("/") && !valor.startsWith("//");
    const storage = valor.startsWith("engops/");
    return (interno || storage) && !valor.includes("\\") && !valor.split("/").includes("..");
  }, "Use um arquivo interno do sistema.")]),
);

export const configuracaoSstSchema = z.object({
  nomeExibicao: z.string().trim().min(2).max(120),
  responsavelNome: z.string().trim().min(2).max(160),
  responsavelRegistro: z.string().trim().min(2).max(80),
  logoPrincipalUrl: urlImagem,
  logoSimboloUrl: urlImagem,
  logoClienteUrl: urlImagem,
});

export type ConfiguracaoSst = z.infer<typeof configuracaoSstSchema>;
