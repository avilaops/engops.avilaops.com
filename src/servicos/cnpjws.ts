import { z } from "zod";
import { validarCpfCnpj } from "@/dominio/validacao";

const texto = z.string().nullish();
export const respostaCnpj = z.object({
  razao_social: z.string().min(1),
  capital_social: texto,
  atualizado_em: texto,
  porte: z.object({ descricao: texto }).passthrough().nullish(),
  natureza_juridica: z.object({ descricao: texto }).passthrough().nullish(),
  estabelecimento: z.object({
    cnpj: z.string(), nome_fantasia: texto, situacao_cadastral: texto,
    data_inicio_atividade: texto, tipo_logradouro: texto, logradouro: texto, numero: texto,
    complemento: texto, bairro: texto, cep: texto, ddd1: texto, telefone1: texto, email: texto,
    cidade: z.object({ nome: texto }).passthrough().nullish(),
    estado: z.object({ sigla: texto }).passthrough().nullish(),
    atividade_principal: z.object({ id: texto, descricao: texto }).passthrough().nullish(),
  }).passthrough(),
}).passthrough();
export type DadosCnpj = z.infer<typeof respostaCnpj>;

export async function consultarCnpj(documento: string): Promise<DadosCnpj> {
  const cnpj = documento.replace(/\D/g, "");
  if (cnpj.length !== 14 || !validarCpfCnpj(cnpj)) throw new Error("Informe um CNPJ válido com 14 dígitos. CPF deve ser preenchido manualmente.");
  let resposta: Response;
  try {
    resposta = await fetch(`https://publica.cnpj.ws/cnpj/${cnpj}`, { next: { revalidate: 86400 }, signal: AbortSignal.timeout(15000) });
  } catch { throw new Error("Não foi possível consultar a CNPJ.ws. Tente novamente ou preencha manualmente."); }
  if (resposta.status === 429) throw new Error("Limite de consultas da CNPJ.ws atingido. Aguarde um minuto ou preencha manualmente.");
  if (resposta.status === 404) throw new Error("CNPJ não encontrado na base da CNPJ.ws. Você pode preencher os dados manualmente.");
  if (!resposta.ok) throw new Error("A CNPJ.ws está indisponível. Tente novamente ou preencha manualmente.");
  const dados = respostaCnpj.safeParse(await resposta.json().catch(() => null));
  if (!dados.success || dados.data.estabelecimento.cnpj.replace(/\D/g, "") !== cnpj) throw new Error("A consulta retornou dados inválidos ou de outro CNPJ.");
  return dados.data;
}
