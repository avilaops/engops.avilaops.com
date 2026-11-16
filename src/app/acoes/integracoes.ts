"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { exigirOperador } from "@/lib/tenant";
import { configurarSiop, executarConsultaSiop } from "@/servicos/siop";
import { configurarOperacao, registrarOperacaoManual } from "@/servicos/operacoes-externas";
import { ErroSiop } from "@/integracoes/siop/soap";
import { ErroOperacao, OPERACOES } from "@/dominio/operacoes-externas";
import type { EstadoAcao } from "@/app/acoes/demandas";

function erroSeguro(erro: unknown): EstadoAcao {
  if (erro instanceof ZodError) return { erro: "Confira os campos obrigatórios e os formatos informados." };
  if (erro instanceof ErroSiop || erro instanceof ErroOperacao) return { erro: erro.message };
  return { erro: "Não foi possível concluir. Atualize a página e tente novamente." };
}
const texto = (form: FormData, campo: string) => String(form.get(campo) ?? "");
const numero = (form: FormData, campo: string) => texto(form, campo).trim() ? Number(texto(form, campo)) : NaN;

export async function salvarSiopAction(_: EstadoAcao, form: FormData): Promise<EstadoAcao> {
  const op = await exigirOperador();
  try {
    await configurarSiop(op, { ambiente: texto(form, "ambiente"), usuario: texto(form, "usuario"), email: texto(form, "email"),
      perfil: numero(form, "perfil"), senhaEnvRef: texto(form, "senhaEnvRef"), habilitada: form.get("habilitada") === "on" });
    revalidatePath("/automacoes/siop");
    return { ok: "Configuração SIOP salva." };
  } catch (erro) { return erroSeguro(erro); }
}

export async function consultarSiopAction(_: EstadoAcao, form: FormData): Promise<EstadoAcao> {
  const op = await exigirOperador();
  let id: string;
  try {
    const consulta = await executarConsultaSiop(op, { ambiente: texto(form, "ambiente"), anoExercicio: numero(form, "anoExercicio") });
    id = consulta.id;
  } catch (erro) {
    revalidatePath("/automacoes/siop");
    return erroSeguro(erro);
  }
  revalidatePath("/automacoes/siop");
  redirect(`/automacoes/siop/${id}`);
}

export async function salvarOperacaoAction(_: EstadoAcao, form: FormData): Promise<EstadoAcao> {
  const op = await exigirOperador();
  try {
    const config = await configurarOperacao(op, { sistema: texto(form, "sistema"), portalUrl: texto(form, "portalUrl"),
      unidade: texto(form, "unidade"), operacao: texto(form, "operacao"), observacoes: texto(form, "observacoes") });
    revalidatePath(`/automacoes/operacao/${OPERACOES[config.sistema as keyof typeof OPERACOES].slug}`);
    return { ok: "Parâmetros da operação salvos." };
  } catch (erro) { return erroSeguro(erro); }
}

export async function registrarManualAction(_: EstadoAcao, form: FormData): Promise<EstadoAcao> {
  const op = await exigirOperador();
  try {
    const resultado = await registrarOperacaoManual(op, { sistema: texto(form, "sistema"), demandaId: texto(form, "demandaId"),
      documentoId: texto(form, "documentoId"), protocolo: texto(form, "protocolo"), observacoes: texto(form, "observacoes") });
    revalidatePath("/automacoes");
    revalidatePath("/automacoes/operacao/[sistema]", "page");
    revalidatePath(`/demandas/${texto(form, "demandaId")}`);
    return { ok: resultado.novo ? "Operação manual registrada com comprovante." : "Este comprovante e protocolo já foram registrados." };
  } catch (erro) { return erroSeguro(erro); }
}
