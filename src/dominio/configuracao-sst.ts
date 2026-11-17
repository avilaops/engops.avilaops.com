import { z } from "zod";

const urlImagem = z.string().trim().transform(valor => valor || null).refine(valor => valor === null || valor.startsWith("/") || /^https:\/\//i.test(valor), "Use caminho local ou URL HTTPS.");

export const configuracaoSstSchema = z.object({
  nomeExibicao: z.string().trim().min(2).max(120),
  responsavelNome: z.string().trim().min(2).max(160),
  responsavelRegistro: z.string().trim().min(2).max(80),
  logoPrincipalUrl: urlImagem,
  logoSimboloUrl: urlImagem,
  logoClienteUrl: urlImagem,
});

export type ConfiguracaoSst = z.infer<typeof configuracaoSstSchema>;
