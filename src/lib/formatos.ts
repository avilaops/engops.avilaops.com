/** Formatação em pt-BR, num lugar só. */

const fmtData = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
const fmtDataHora = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});
const fmtHora = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

export function data(d: Date | string | null | undefined): string {
  if (!d) return "";
  return fmtData.format(new Date(d));
}

export function dataHora(d: Date | string | null | undefined): string {
  if (!d) return "";
  return fmtDataHora.format(new Date(d));
}

export function hora(d: Date | string | null | undefined): string {
  if (!d) return "";
  return fmtHora.format(new Date(d));
}

export function bytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function area(m2: unknown): string {
  if (m2 === null || m2 === undefined) return "";
  const n = Number(m2);
  if (Number.isNaN(n)) return "";
  return `${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m²`;
}

export function moeda(v: unknown): string {
  if (v === null || v === undefined) return "";
  const n = Number(v);
  if (Number.isNaN(n)) return "";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** "hoje", "amanhã", "atrasada 2 dias", "em 5 dias". */
export function prazoRelativo(prazo: Date | string | null | undefined, agora = new Date()): { texto: string; tom: "atrasada" | "hoje" | "risco" | "ok" | "sem" } {
  if (!prazo) return { texto: "sem prazo", tom: "sem" };
  const p = new Date(prazo);
  const inicioHoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
  const inicioPrazo = new Date(p.getFullYear(), p.getMonth(), p.getDate());
  const dias = Math.round((inicioPrazo.getTime() - inicioHoje.getTime()) / 86_400_000);
  if (dias < 0) return { texto: `atrasada ${-dias} ${-dias === 1 ? "dia" : "dias"}`, tom: "atrasada" };
  if (dias === 0) return { texto: "hoje", tom: "hoje" };
  if (dias === 1) return { texto: "amanhã", tom: "risco" };
  if (dias <= 3) return { texto: `em ${dias} dias`, tom: "risco" };
  return { texto: `em ${dias} dias`, tom: "ok" };
}

export function mascararDocumento(doc: string | null | undefined): string {
  if (!doc) return "";
  const d = doc.replace(/\D/g, "");
  if (d.length === 11) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  if (d.length === 14) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
  return doc;
}
