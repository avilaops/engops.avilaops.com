import { z } from "zod";
import type { StatusDemanda } from "@prisma/client";

export const sistemaOperacionalSchema = z.enum(["RAE", "SIOPI", "BANCO_BRASIL"]);
export type SistemaOperacional = z.infer<typeof sistemaOperacionalSchema>;
export const OPERACOES: Record<SistemaOperacional, { slug: string; titulo: string; descricao: string; dependencia: string; tipoDocumento: string; fila: StatusDemanda[] }> = {
  RAE: { slug: "rae", titulo: "RAE", descricao: "Organize as demandas e registre o relatório produzido e conferido pela equipe.", dependencia: "A geração automática aguarda o modelo oficial e as regras de cálculo. Anexe o relatório elaborado fora do EngOps ao dossiê.", tipoDocumento: "RAE", fila: ["SIMIL_CONCLUIDO", "RAE_PENDENTE"] },
  SIOPI: { slug: "siopi", titulo: "SIOPI • CAIXA", descricao: "Acompanhe as ordens de serviço e registre a operação realizada no portal.", dependencia: "O acesso automático aguarda o fluxo oficial de autenticação, preenchimento e confirmação. A operação no portal é manual.", tipoDocumento: "SIOPI_COMPROVANTE", fila: ["RAE_CONCLUIDO", "SIOPI_PENDENTE"] },
  BANCO_BRASIL: { slug: "banco-brasil", titulo: "Banco do Brasil", descricao: "Vincule a operação do banco a uma demanda e guarde seu comprovante.", dependencia: "Configure o portal e a operação atendida. A integração automática depende da definição do serviço e do fluxo oficial.", tipoDocumento: "BB_COMPROVANTE", fila: [] },
};
export function sistemaPeloSlug(slug: string): SistemaOperacional | undefined {
  return (Object.keys(OPERACOES) as SistemaOperacional[]).find(sistema => OPERACOES[sistema].slug === slug);
}
const textoOpcional = (max: number) => z.string().trim().max(max).transform(v => v || null);
const portal = textoOpcional(1000).refine(valor => {
  if (!valor) return true;
  try {
    const url = new URL(valor);
    return url.protocol === "https:" && !url.username && !url.password && !url.search && !url.hash;
  } catch { return false; }
}, "Informe uma URL HTTPS sem senha, parâmetros ou fragmentos");
export const configuracaoOperacionalSchema = z.object({
  sistema: sistemaOperacionalSchema, portalUrl: portal, unidade: textoOpcional(100),
  operacao: textoOpcional(200), observacoes: textoOpcional(2000),
}).strict();
export const registroManualSchema = z.object({
  sistema: sistemaOperacionalSchema, demandaId: z.string().min(1).max(100), documentoId: z.string().min(1).max(100),
  protocolo: z.string().trim().max(200), observacoes: z.string().trim().max(2000),
}).strict().refine(v => v.sistema === "RAE" || v.protocolo.length > 0, "Informe o protocolo da operação realizada no portal");

export class ErroOperacao extends Error {}
