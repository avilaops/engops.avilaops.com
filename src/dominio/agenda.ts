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
