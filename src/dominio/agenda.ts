export type Intervalo = { inicio: Date; fim: Date };

export function intervaloDoMes(ano: number, mes: number): Intervalo {
  return { inicio: new Date(Date.UTC(ano, mes - 1, 1)), fim: new Date(Date.UTC(ano, mes, 1)) };
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
