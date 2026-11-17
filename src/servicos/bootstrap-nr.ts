import { CATALOGO_NR } from "@/dominio/catalogo-nr";

export type RegistroCatalogoNr = { codigo: string; titulo: string; ativo: boolean; textoReferencia: string };
export type RepositorioCatalogoNr = { upsert: (item: RegistroCatalogoNr) => Promise<unknown> };

export async function sincronizarCatalogoNr(repositorio: RepositorioCatalogoNr) {
  for (const norma of CATALOGO_NR) {
    await repositorio.upsert({
      codigo: norma.codigo,
      titulo: norma.titulo,
      ativo: norma.vigente,
      textoReferencia: JSON.stringify({ conteudoProgramatico: norma.conteudoProgramatico }),
    });
  }
}
