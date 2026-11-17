import { z } from "zod";

export type Intervalo = { inicio: Date; fim: Date };

export const compromissoAgendaSchema = z.object({
  clienteId: z.string().min(1),
  titulo: z.string().trim().min(2),
  inicio: z.preprocess(valor => typeof valor === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(valor) ? `${valor}${valor.length === 16 ? ":00" : ""}-03:00` : valor, z.coerce.date()),
  descricao: z.string().trim().optional(),
});

export function mesAtualSaoPaulo(agora = new Date()): { ano: number; mes: number } {
  const partes = new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", year: "numeric", month: "numeric" }).formatToParts(agora);
  return { ano: Number(partes.find(parte => parte.type === "year")?.value), mes: Number(partes.find(parte => parte.type === "month")?.value) };
}

export function intervaloDoMes(ano: number, mes: number): Intervalo {
  return { inicio: new Date(Date.UTC(ano, mes - 1, 1, 3)), fim: new Date(Date.UTC(ano, mes, 1, 3)) };
}

export function chaveDataOperacional(data: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(data);
}

export function agruparEventosPorDia<T extends { inicio: Date }>(eventos: T[]): Map<string, T[]> {
  const grupos = new Map<string, T[]>();
  for (const evento of eventos) {
    const chave = chaveDataOperacional(evento.inicio);
    grupos.set(chave, [...(grupos.get(chave) ?? []), evento]);
  }
  return grupos;
}

export function pertenceAoIntervalo(data: Date, intervalo: Intervalo): boolean {
  return data >= intervalo.inicio && data < intervalo.fim;
}

export function fontesDaAgenda(modulos: ReadonlyArray<"RH" | "SST">) {
  return { compromissos: modulos.includes("RH"), sst: modulos.includes("SST") };
}

export function diasDoCalendario(ano: number, mes: number) {
  const primeiro = new Date(Date.UTC(ano, mes - 1, 1));
  const inicio = new Date(primeiro); inicio.setUTCDate(inicio.getUTCDate() - inicio.getUTCDay());
  const ultimo = new Date(Date.UTC(ano, mes, 0));
  const fim = new Date(ultimo); fim.setUTCDate(fim.getUTCDate() + (6 - fim.getUTCDay()));
  const dias: Array<{ data: string; dia: number; doMes: boolean }> = [];
  for (const cursor = new Date(inicio); cursor <= fim; cursor.setUTCDate(cursor.getUTCDate() + 1)) dias.push({ data: cursor.toISOString().slice(0, 10), dia: cursor.getUTCDate(), doMes: cursor.getUTCMonth() === mes - 1 });
  return dias;
}
