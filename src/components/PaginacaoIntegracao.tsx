import Link from "next/link";

export default function PaginacaoIntegracao({ base, pagina, total, tamanho, parametros = {}, parametroPagina = "pagina", rotulo = "Paginação" }: {
  base: string; pagina: number; total: number; tamanho: number; parametros?: Record<string, string>; parametroPagina?: string; rotulo?: string;
}) {
  const paginas = Math.max(1, Math.ceil(total / tamanho));
  const destino = (valor: number) => `${base}?${new URLSearchParams({ ...parametros, [parametroPagina]: String(valor) })}`;
  return <nav className="gov-pagination" aria-label={rotulo}>
    {pagina > 1 ? <Link className="secondary-button" href={destino(pagina - 1)}>Anterior</Link> : null}
    <span>Página {pagina} de {paginas}</span>
    {pagina < paginas ? <Link className="secondary-button" href={destino(pagina + 1)}>Próxima</Link> : null}
  </nav>;
}
