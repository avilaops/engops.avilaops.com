import { z } from "zod";

export const AMBIENTES_SIOP = ["HOMOLOGACAO", "PRODUCAO"] as const;
export const ambienteSiopSchema = z.enum(AMBIENTES_SIOP);
export type AmbienteSiop = z.infer<typeof ambienteSiopSchema>;
const inteiro = z.number().int().min(-2147483648).max(2147483647);
export const baseDTOSchema = z.object({}).strict();

/** A senha do DTO é o MD5 exigido pelo protocolo, nunca a senha de login. */
export const credencialDTOSchema = z.object({
  email: z.string().optional(),
  perfil: inteiro.optional(),
  senha: z.string().regex(/^[a-fA-F0-9]{32}$/),
  usuario: z.string().min(1),
}).strict();
export const filtroExecucaoOrcamentariaPacDTOSchema = z.object({ anoExercicio: inteiro.optional() }).strict();

/** Decimal exato; recusa frações não representáveis em numeric(16,2). */
export function normalizarDecimal(valor: string): string {
  const partes = /^([+-]?)(?:(\d+)(?:\.(\d*))?|\.(\d+))$/.exec(valor.trim());
  if (!partes) throw new Error("Decimal SIOP inválido");
  const fracao = (partes[3] ?? partes[4] ?? "").replace(/0+$/, "");
  if (fracao.length > 2) throw new Error("Decimal SIOP excede duas casas");
  const inteiro = BigInt(partes[2] ?? "0");
  const centavos = inteiro * 100n + BigInt(fracao.padEnd(2, "0"));
  if (centavos > 9999999999999999n) throw new Error("Decimal SIOP excede numeric(16,2)");
  return `${partes[1] === "-" && centavos !== 0n ? "-" : ""}${inteiro}.${fracao.padEnd(2, "0")}`;
}
const decimal = z.string().refine((valor) => {
  try { normalizarDecimal(valor); return true; } catch { return false; }
}, "Valor fora de numeric(16,2)").transform(normalizarDecimal);

export const CAMPOS_DECIMAIS = [
  "antecipado", "autorizado", "bloqueado_remanejamento_de_credito", "bloqueado_rp2", "bloqueado_rp3",
  "disponivel", "dotacaoatual", "dotacaoinicial", "emp_liq_inscr_rap_np", "empenhado", "empenhoaliquidar",
  "empenholiquidado", "pago", "projetolei", "rapapagar", "rapcancelados", "rapexerciciosanteriores", "rapinscrito", "rappago",
] as const;

// Nomes e opcionalidade do WSDL de homologação, incluindo anoexercicio.
export const execucaoOrcamentariaPacDTOSchema = z.object({
  acao: z.string().optional(), anoexercicio: inteiro.optional(),
  antecipado: decimal.optional(), autorizado: decimal.optional(),
  bloqueado_remanejamento_de_credito: decimal.optional(), bloqueado_rp2: decimal.optional(), bloqueado_rp3: decimal.optional(),
  descricaoesfera: z.string().optional(), descricaofuncao: z.string().optional(), descricaolocalizador: z.string().optional(),
  descricaoorgao: z.string().optional(), descricaosubfuncao: z.string().optional(), descricaouo: z.string().optional(),
  disponivel: decimal.optional(), dotacaoatual: decimal.optional(), dotacaoinicial: decimal.optional(),
  emp_liq_inscr_rap_np: decimal.optional(), empenhado: decimal.optional(), empenhoaliquidar: decimal.optional(), empenholiquidado: decimal.optional(),
  esfera: z.string().optional(), funcao: z.string().optional(), localizador: z.string().optional(), orgao: z.string().optional(),
  pago: decimal.optional(), pidescricao: z.string().optional(), plano_interno: z.string().optional(), programa: z.string().optional(),
  projetolei: decimal.optional(), rapapagar: decimal.optional(), rapcancelados: decimal.optional(), rapexerciciosanteriores: decimal.optional(),
  rapinscrito: decimal.optional(), rappago: decimal.optional(), rp_atual: z.string().optional(), rp_lei: z.string().optional(),
  subfuncao: z.string().optional(), tituloacao: z.string().optional(), tituloprograma: z.string().optional(), uo: z.string().optional(),
}).strict();
export const retornoDTOSchema = z.object({ sucesso: z.boolean(), mensagensErro: z.array(z.string().nullable()).optional() }).strict();
export const retornoExecucaoPacDTOSchema = retornoDTOSchema.extend({
  execucoesOrcamentarias: z.object({ execucaoOrcamentaria: z.array(execucaoOrcamentariaPacDTOSchema).optional() }).strict().optional(),
});
export const consultarPacSchema = z.object({ credencial: credencialDTOSchema.optional(), filtro: filtroExecucaoOrcamentariaPacDTOSchema.optional() }).strict();
export const consultarPacResponseSchema = z.object({ return: retornoExecucaoPacDTOSchema.optional() }).strict();
export type CredencialDTO = z.infer<typeof credencialDTOSchema>;
export type BaseDTO = z.infer<typeof baseDTOSchema>;
export type FiltroExecucaoOrcamentariaPacDTO = z.infer<typeof filtroExecucaoOrcamentariaPacDTOSchema>;
export type ExecucaoOrcamentariaPacDTO = z.infer<typeof execucaoOrcamentariaPacDTOSchema>;
export type RetornoDTO = z.infer<typeof retornoDTOSchema>;
export type RetornoExecucaoPacDTO = z.infer<typeof retornoExecucaoPacDTOSchema>;
export type ConsultarPac = z.infer<typeof consultarPacSchema>;
export type ConsultarPacResponse = z.infer<typeof consultarPacResponseSchema>;

export const configuracaoSiopSchema = z.object({
  ambiente: ambienteSiopSchema.default("HOMOLOGACAO"),
  usuario: z.string().trim().min(1).max(256), email: z.string().max(320).optional(),
  perfil: inteiro, senhaEnvRef: z.string().regex(/^SIOP_[A-Z0-9_]{1,100}_MD5$/),
  habilitada: z.boolean().default(false),
}).strict();
// exercicio é aceito na API do EngOps como alias do manual; no XML sai anoExercicio.
export const consultaSiopSchema = z.object({
  ambiente: ambienteSiopSchema.default("HOMOLOGACAO"),
  anoExercicio: inteiro.optional(), exercicio: inteiro.optional(),
}).strict().refine((v) => (v.anoExercicio !== undefined || v.exercicio !== undefined) &&
  (v.anoExercicio === undefined || v.exercicio === undefined || v.anoExercicio === v.exercicio), "Informe um exercício sem valores conflitantes")
  .transform((v) => ({ ambiente: v.ambiente, anoExercicio: (v.anoExercicio ?? v.exercicio)! }));
