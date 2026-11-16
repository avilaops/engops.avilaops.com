import { prisma } from "@/lib/prisma";
import { auditar } from "@/lib/auditoria";
import { pode } from "@/lib/rbac";
import type { Operador } from "@/lib/tenant";
import { configuracaoOperacionalSchema, registroManualSchema, sistemaOperacionalSchema, ErroOperacao, OPERACOES, type SistemaOperacional } from "@/dominio/operacoes-externas";

export async function configurarOperacao(op: Operador, entrada: unknown) {
  if (!pode(op.papel, "empresa.administrar")) throw new ErroOperacao("Somente administrador pode configurar esta operação.");
  const dados = configuracaoOperacionalSchema.parse(entrada);
  return prisma.$transaction(async tx => {
    const configuracao = await tx.configuracaoOperacional.upsert({
      where: { empresaId_sistema: { empresaId: op.empresa.id, sistema: dados.sistema } },
      create: { ...dados, empresaId: op.empresa.id, atualizadoPor: op.email }, update: { ...dados, atualizadoPor: op.email },
    });
    await auditar({ empresaId: op.empresa.id, usuario: op.email, acao: "integracao.configurar", objetoTipo: "ConfiguracaoOperacional", objetoId: configuracao.id, depois: dados }, tx);
    return configuracao;
  });
}

export async function painelOperacao(op: Operador, sistema: SistemaOperacional, busca = "", pagina = 1, paginaHistorico = 1) {
  if (!pode(op.papel, "demanda.ver")) throw new ErroOperacao("Sem permissão para consultar demandas.");
  sistemaOperacionalSchema.parse(sistema);
  const metadados = OPERACOES[sistema];
  const termo = busca.trim().slice(0, 160);
  const where = { empresaId: op.empresa.id, arquivadaEm: null, NOT: { status: "ARQUIVADA" as const },
    ...(metadados.fila.length && !termo ? { status: { in: metadados.fila } } : {}),
    ...(termo ? { OR: [{ codigo: { contains: termo, mode: "insensitive" as const } }, { numeroOs: { contains: termo, mode: "insensitive" as const } }] } : {}),
  };
  const [configuracao, total, demandas, historico, totalHistorico] = await Promise.all([
    prisma.configuracaoOperacional.findUnique({ where: { empresaId_sistema: { empresaId: op.empresa.id, sistema } } }),
    prisma.demanda.count({ where }),
    prisma.demanda.findMany({ where, orderBy: [{ prazo: "asc" }, { id: "asc" }], skip: (pagina - 1) * 20, take: 20,
      include: { documentos: { where: { empresaId: op.empresa.id, removidoEm: null, tipo: metadados.tipoDocumento }, orderBy: { criadoEm: "desc" } } } }),
    prisma.execucaoExterna.findMany({ where: { sistema, demanda: { empresaId: op.empresa.id } },
      include: { demanda: { select: { id: true, codigo: true } } }, orderBy: [{ iniciadoEm: "desc" }, { id: "desc" }], skip: (paginaHistorico - 1) * 20, take: 20 }),
    prisma.execucaoExterna.count({ where: { sistema, demanda: { empresaId: op.empresa.id } } }),
  ]);
  const ids = historico.flatMap(x => {
    const dados = x.dados as { documentoId?: string };
    return dados.documentoId ? [dados.documentoId] : [];
  });
  const documentos = await prisma.documento.findMany({ where: { id: { in: ids }, empresaId: op.empresa.id, removidoEm: null }, select: { id: true } });
  return { configuracao, total, demandas, historico, totalHistorico, documentosAtivos: documentos.map(d => d.id) };
}

/** Registra trabalho já realizado pela pessoa, sem executar portal nem avançar a demanda. */
export async function registrarOperacaoManual(op: Operador, entrada: unknown) {
  if (!pode(op.papel, "automacao.executar")) throw new ErroOperacao("Sem permissão para registrar a operação.");
  const dados = registroManualSchema.parse(entrada);
  return prisma.$transaction(async tx => {
    // Serializa dois cliques e impede remoção concorrente do comprovante durante o registro.
    const demandas = await tx.$queryRaw<Array<{ id: string }>>`SELECT id FROM demandas WHERE id = ${dados.demandaId} AND "empresaId" = ${op.empresa.id} AND "arquivadaEm" IS NULL AND status <> 'ARQUIVADA' FOR UPDATE`;
    if (!demandas.length) throw new ErroOperacao("Demanda não encontrada ou arquivada.");
    await tx.$queryRaw`SELECT id FROM documentos WHERE id = ${dados.documentoId} AND "empresaId" = ${op.empresa.id} FOR UPDATE`;
    const documento = await tx.documento.findFirst({ where: { id: dados.documentoId, demandaId: dados.demandaId, empresaId: op.empresa.id, removidoEm: null, tipo: OPERACOES[dados.sistema].tipoDocumento } });
    if (!documento) throw new ErroOperacao("Escolha um comprovante ativo desta demanda e do tipo correto.");
    const config = await tx.configuracaoOperacional.findUnique({ where: { empresaId_sistema: { empresaId: op.empresa.id, sistema: dados.sistema } } });
    if (dados.sistema === "BANCO_BRASIL" && (!config?.portalUrl || !config.operacao)) throw new ErroOperacao("Configure o portal e a operação do Banco do Brasil antes de registrar.");
    const existente = await tx.execucaoExterna.findFirst({ where: { demandaId: dados.demandaId, sistema: dados.sistema,
      status: "CONCLUIDA", protocolo: dados.protocolo || null, dados: { path: ["documentoId"], equals: documento.id } } });
    if (existente) return { id: existente.id, novo: false };
    const registro = await tx.execucaoExterna.create({ data: {
      demandaId: dados.demandaId, sistema: dados.sistema, modo: "REAL", status: "CONCLUIDA", protocolo: dados.protocolo || null,
      dados: { origem: "REGISTRO_MANUAL", documentoId: documento.id, observacoes: dados.observacoes,
        contexto: { operacao: config?.operacao ?? null, unidade: config?.unidade ?? null, portalUrl: config?.portalUrl ?? null } },
      evidencias: { documentoId: documento.id, hash: documento.hash }, executadoPor: op.email, terminadoEm: new Date(),
    } });
    await auditar({ empresaId: op.empresa.id, usuario: op.email, acao: "integracao.registro_manual", objetoTipo: "ExecucaoExterna", objetoId: registro.id,
      depois: { sistema: dados.sistema, demandaId: dados.demandaId, documentoId: documento.id, protocolo: dados.protocolo || null } }, tx);
    return { id: registro.id, novo: true };
  });
}
