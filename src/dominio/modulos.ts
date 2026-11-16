export const MODULOS = [
  { chave: "RH", nome: "Recursos Humanos", descricao: "Setores, cargos e funcionários." },
  { chave: "SST", nome: "Segurança do Trabalho", descricao: "Treinamentos, certificados, ordens de serviço e normas." },
] as const;

export type ModuloEngOps = (typeof MODULOS)[number]["chave"];

export function moduloHabilitado(modulos: ReadonlyArray<{ modulo: string; ativo: boolean }>, modulo: ModuloEngOps): boolean {
  return modulos.some((item) => item.modulo === modulo && item.ativo);
}

export function podeAdministrarModulos(dono: boolean): boolean {
  return dono;
}

