"use server";

import { z } from "zod";
import { UFS } from "@/dominio/demandas";
import { pode } from "@/lib/rbac";
import { exigirOperador } from "@/lib/tenant";

const respostaCep = z.object({
  cep: z.string(),
  logradouro: z.string(),
  bairro: z.string(),
  localidade: z.string().trim().min(1),
  uf: z.enum(UFS),
});

export async function consultarCepAction(valor: string) {
  const op = await exigirOperador();
  if (!pode(op.papel, "demanda.criar") && !pode(op.papel, "demanda.editar")) return { erro: "Sem permissão para consultar o CEP." };
  if (typeof valor !== "string" || !/^\d{5}-?\d{3}$/.test(valor.trim())) return { erro: "Informe um CEP com 8 dígitos." };
  const cep = valor.trim().replace("-", "");
  try {
    const resposta = await fetch(`https://viacep.com.br/ws/${cep}/json/`, {
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(6000),
    });
    if (resposta.ok) {
      const corpo = await resposta.json();
      if (corpo?.erro === true || corpo?.erro === "true") return { erro: "CEP não encontrado. Confira o número ou preencha o endereço manualmente." };
      const dados = respostaCep.safeParse(corpo);
      if (dados.success && dados.data.cep.replace("-", "") === cep) {
        const { logradouro, bairro, localidade, uf } = dados.data;
        return { endereco: { cep: dados.data.cep, logradouro, bairro, municipio: localidade, uf } };
      }
    }
  } catch {
    // O cadastro manual continua disponível quando o serviço externo falha.
  }
  return { erro: "Consulta de CEP indisponível. Tente novamente ou preencha o endereço manualmente." };
}
