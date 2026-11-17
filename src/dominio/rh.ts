import { z } from "zod";

const texto = z.string().trim().min(1);

export const funcionarioSchema = z.object({
  clienteId: texto,
  nome: texto,
  cpf: z.string().transform((valor) => valor.replace(/\D/g, "")).pipe(z.string().length(11)),
  setorId: texto,
  cargoId: texto,
  matricula: z.string().trim().optional(),
  email: z.string().trim().email().optional().or(z.literal("")),
});

export const cadastroNomeSchema = z.object({ clienteId: texto, nome: texto, descricao: z.string().trim().optional() });

export const alteracaoEstruturaRhSchema = z.object({
  id: texto,
  clienteId: texto,
  nome: texto,
  descricao: z.string().trim().optional().or(z.literal("")).transform(valor => valor || null),
  ativo: z.preprocess(valor => valor === true || valor === "true" || valor === "on", z.boolean()),
});

export const alteracaoFuncionarioSchema = z.object({
  id: texto,
  clienteId: texto,
  nome: texto,
  email: z.string().trim().email().optional().or(z.literal("")).transform(valor => valor || null),
  telefone: z.string().trim().max(30).optional().or(z.literal("")).transform(valor => valor || null),
  matricula: z.string().trim().max(80).optional().or(z.literal("")).transform(valor => valor || null),
  status: z.enum(["ATIVO", "AFASTADO", "DESLIGADO"]),
});
