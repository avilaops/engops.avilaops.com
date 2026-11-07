/** CSV para planilhas: preserva delimitadores e neutraliza fórmulas de células. */
export function gerarCsv(linhas: ReadonlyArray<ReadonlyArray<string | number | null>>): string {
  return "\uFEFF" + linhas.map((linha) => linha.map((valor) => {
    const texto = String(valor ?? "");
    const seguro = /^[\s\u0000-\u001f]*[=+@-]/.test(texto) ? `'${texto}` : texto;
    return `"${seguro.replaceAll('"', '""')}"`;
  }).join(";")).join("\r\n") + "\r\n";
}
