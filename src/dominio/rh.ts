import { z } from "zod";

const texto = z.string().trim().min(1);

export const funcionarioSchema = z.object({
  nome: texto,
  cpf: z.string().transform((valor) => valor.replace(/\D/g, "")).pipe(z.string().length(11)),
  setorId: texto,
  cargoId: texto,
  matricula: z.string().trim().optional(),
  email: z.string().trim().email().optional().or(z.literal("")),
});

export const cadastroNomeSchema = z.object({ nome: texto, descricao: z.string().trim().optional() });
