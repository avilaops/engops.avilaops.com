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

export function podeAlterarPessoas(papel: string): boolean {
  return papel !== "CONSULTA";
}

export function alteracoesDeDependencia(modulo: ModuloEngOps, ativo: boolean, ativos: ReadonlyArray<ModuloEngOps> = []): Array<{ modulo: ModuloEngOps; ativo: boolean }> {
  if (modulo === "SST" && ativo) return [{ modulo: "RH", ativo: true }];
  if (modulo === "RH" && !ativo && ativos.includes("SST")) throw new Error("RH não pode ser desativado enquanto SST estiver ativo.");
  return [];
}

