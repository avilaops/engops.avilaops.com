type EscopoCliente = { empresaId: string; clienteId: string | null };

export function validarVinculoRh(escopo: EscopoCliente, setor: EscopoCliente | null, cargo: EscopoCliente | null) {
  const pertence = (item: EscopoCliente | null) => item?.empresaId === escopo.empresaId && item.clienteId === escopo.clienteId;
  if (!pertence(setor) || !pertence(cargo)) throw new Error("Setor ou cargo não pertence à empresa cliente selecionada.");
}
