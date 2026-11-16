export function calcularVencimento(emissao: Date, validadeMeses: number): Date {
  const resultado = new Date(emissao);
  const dia = resultado.getUTCDate();
  resultado.setUTCDate(1);
  resultado.setUTCMonth(resultado.getUTCMonth() + validadeMeses);
  const ultimoDia = new Date(Date.UTC(resultado.getUTCFullYear(), resultado.getUTCMonth() + 1, 0)).getUTCDate();
  resultado.setUTCDate(Math.min(dia, ultimoDia));
  return resultado;
}

export function participantePertenceAoTenant(empresaId: string, empresaDoFuncionarioId: string): boolean {
  return empresaId === empresaDoFuncionarioId;
}
