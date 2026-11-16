import { createHash } from "node:crypto";
import { z } from "zod";
import { CNPJ_GOV, UFS, type OportunidadeGov } from "@/integracoes/gov";

export function chaveGov(item: Pick<OportunidadeGov, "id" | "tipo"> & Partial<Pick<OportunidadeGov, "fonte">>) {
  return `${item.tipo === "PREGAO" ? "compras" : "pncp"}:${item.id}`;
}
export const normalizarBuscaGov = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
export function fingerprintGov(item: OportunidadeGov) {
  // Fonte e horário de atualização podem mudar sem alterar a oportunidade.
  const { fonte: _fonte, atualizado: _atualizado, ...conteudo } = item;
  void _fonte; void _atualizado;
  return createHash("sha256").update(JSON.stringify(Object.entries(conteudo).sort(([a], [b]) => a.localeCompare(b)))).digest("hex");
}
const data = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => {
  const d = new Date(v); return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === v;
});
export const esquemaBuscaGlobal = z.object({
  busca: z.string().trim().max(200).optional(), orgao: z.string().trim().max(200).optional(),
  cnpj: z.string().toUpperCase().regex(CNPJ_GOV).optional(), uf: z.string().refine(v => UFS.includes(v)).optional(),
  regiao: z.enum(["Norte", "Nordeste", "Centro-Oeste", "Sudeste", "Sul"]).optional(),
  categoria: z.string().max(100).optional(), modalidade: z.string().max(100).optional(),
  tipo: z.enum(["CONTRATACAO", "PLANEJAMENTO", "PREGAO"]).optional(),
  fonte: z.enum(["PNCP", "COMPRAS"]).optional(), abertas: z.enum(["sim", "nao"]).optional(),
  inicio: data.optional(), fim: data.optional(),
  minimo: z.coerce.number().finite().nonnegative().optional(), maximo: z.coerce.number().finite().nonnegative().optional(),
  pagina: z.coerce.number().int().min(1).max(1000000).default(1),
}).superRefine((v, ctx) => {
  if (v.inicio && v.fim && v.inicio > v.fim) ctx.addIssue({ code: "custom", message: "Período inválido" });
  if (v.minimo !== undefined && v.maximo !== undefined && v.minimo > v.maximo) ctx.addIssue({ code: "custom", message: "Intervalo de valores inválido" });
});
export type BuscaGlobalGov = z.infer<typeof esquemaBuscaGlobal>;
export type CursorGov = { dia: string; pagina: number; modalidade: number; janelaDias?: 1 | 30 };
export function janelaColetaGov(fonte: string, historica: boolean, cursor: CursorGov): 1 | 30 {
  if (!historica) return 1;
  if (fonte !== "planejamento") return 30;
  // Cursores anteriores sem tamanho explícito precisam terminar a janela mensal.
  // Alterar o intervalo de uma página já iniciada poderia omitir itens.
  return cursor.pagina === 1 || cursor.janelaDias === 1 ? 1 : 30;
}
export function proximoCursorGov(cursor: CursorGov, paginas: number, modalidades: number[]): CursorGov {
  if (cursor.pagina < paginas) return { ...cursor, pagina: cursor.pagina + 1 };
  const proxima = modalidades[modalidades.indexOf(cursor.modalidade) + 1];
  if (proxima !== undefined) return { ...cursor, pagina: 1, modalidade: proxima };
  const dia = new Date(`${cursor.dia}T12:00:00Z`); dia.setUTCDate(dia.getUTCDate() + 1);
  return { ...cursor, dia: dia.toISOString().slice(0, 10), pagina: 1, modalidade: modalidades[0] };
}
export const atrasoGov = (falhas: number) => Math.min(3600000, 15000 * 2 ** Math.min(falhas, 8));
export function estadoColetaGov(coleta: { habilitada: boolean; reservaAte: Date | null; ultimoErro: string | null }, agora = new Date()): string {
  const processando = coleta.reservaAte !== null && coleta.reservaAte > agora;
  if (!coleta.habilitada) return processando ? "Pausando após a página em andamento" : "Pausada";
  if (processando) return "Processando página";
  return coleta.ultimoErro ? "Aguardando nova tentativa" : "Ativa";
}
export function regiaoGov(uf: string | null): string | null {
  if (!uf) return null;
  for (const [nome, estados] of [["Norte", "AC AP AM PA RO RR TO"], ["Nordeste", "AL BA CE MA PB PE PI RN SE"], ["Centro-Oeste", "DF GO MT MS"], ["Sudeste", "ES MG RJ SP"], ["Sul", "PR RS SC"]]) if (estados.split(" ").includes(uf)) return nome;
  return null;
}
export function dataGov(v: string | null | undefined): Date | null {
  if (!v) return null;
  const d = new Date(v); return Number.isFinite(d.getTime()) ? d : null;
}
