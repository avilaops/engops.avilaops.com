import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auditar } from "@/lib/auditoria";
import { pode } from "@/lib/rbac";
import type { Operador } from "@/lib/tenant";
import { ambienteSiopSchema, configuracaoSiopSchema, consultaSiopSchema, credencialDTOSchema, type AmbienteSiop, type RetornoExecucaoPacDTO } from "@/dominio/siop";
import { consultarPacRemoto, ENDPOINTS_SIOP, ErroSiop } from "@/integracoes/siop/soap";

function autorizar(op: Operador, escrever: boolean) {
  if (!pode(op.papel, escrever ? "automacao.executar" : "relatorio.ver") &&
      (escrever || !pode(op.papel, "automacao.executar"))) throw new ErroSiop("PROIBIDO", "Seu papel não permite esta operação SIOP");
}
export async function obterConfiguracaoSiop(op: Operador, ambiente: AmbienteSiop = "HOMOLOGACAO") {
  autorizar(op, false);
  const config = await prisma.siopCredencial.findUnique({ where: { empresaId_ambiente: { empresaId: op.empresa.id, ambiente: ambienteSiopSchema.parse(ambiente) } } });
  return {
    ambiente, endpoint: ENDPOINTS_SIOP[ambiente], habilitada: config?.habilitada ?? false,
    usuario: config?.usuario ?? null, email: config?.email ?? null, perfil: config?.perfil ?? null,
    senhaEnvRef: config?.senhaEnvRef ?? null,
    credencialDisponivel: Boolean(config?.senhaEnvRef && /^[a-fA-F0-9]{32}$/.test(process.env[config.senhaEnvRef] ?? "")),
  };
}
export async function configurarSiop(op: Operador, entrada: unknown) {
  if (!pode(op.papel, "empresa.administrar")) throw new ErroSiop("PROIBIDO", "Somente administrador pode configurar a conexão SIOP");
  const dados = configuracaoSiopSchema.parse(entrada);
  if (dados.habilitada && !/^[a-fA-F0-9]{32}$/.test(process.env[dados.senhaEnvRef] ?? "")) {
    throw new ErroSiop("CREDENCIAL_AUSENTE", "A referência protegida não contém uma credencial MD5 válida");
  }
  await prisma.$transaction(async (tx) => {
    const config = await tx.siopCredencial.upsert({
      where: { empresaId_ambiente: { empresaId: op.empresa.id, ambiente: dados.ambiente } },
      create: { ...dados, empresaId: op.empresa.id }, update: dados,
    });
    await auditar({ empresaId: op.empresa.id, usuario: op.email, acao: "siop.configurar", objetoTipo: "SiopCredencial", objetoId: config.id,
      depois: { ambiente: dados.ambiente, habilitada: dados.habilitada, senhaEnvRef: dados.senhaEnvRef } }, tx);
  });
  return obterConfiguracaoSiop(op, dados.ambiente);
}

function protegerMensagens(retorno: RetornoExecucaoPacDTO, segredo: string): RetornoExecucaoPacDTO {
  const expressao = new RegExp(segredo, "gi"); // MD5 validado: somente hexadecimal.
  return { ...retorno, ...(retorno.mensagensErro !== undefined ? {
    mensagensErro: retorno.mensagensErro.map((mensagem) => mensagem?.replace(expressao, "[redigido]") ?? null),
  } : {}) };
}

export async function executarConsultaSiop(op: Operador, entrada: unknown) {
  autorizar(op, true);
  const dados = consultaSiopSchema.parse(entrada);
  const config = await prisma.siopCredencial.findUnique({ where: { empresaId_ambiente: { empresaId: op.empresa.id, ambiente: dados.ambiente } } });
  if (!config?.habilitada || !config.usuario || config.perfil === null || !config.senhaEnvRef) {
    throw new ErroSiop("NAO_CONFIGURADO", "Configure e habilite a credencial SIOP da empresa antes de consultar");
  }
  const validada = credencialDTOSchema.safeParse({ usuario: config.usuario, perfil: config.perfil,
    ...(config.email !== null ? { email: config.email } : {}), senha: process.env[config.senhaEnvRef] });
  if (!validada.success) throw new ErroSiop("CREDENCIAL_AUSENTE", "A credencial protegida do SIOP não está disponível");
  const consulta = await prisma.$transaction(async (tx) => {
    const criada = await tx.siopConsulta.create({ data: { empresaId: op.empresa.id, credencialId: config.id,
      ambiente: dados.ambiente, anoExercicio: dados.anoExercicio, solicitadoPor: op.email } });
    await auditar({ empresaId: op.empresa.id, usuario: op.email, acao: "siop.consultar", objetoTipo: "SiopConsulta", objetoId: criada.id,
      depois: { ambiente: dados.ambiente, anoExercicio: dados.anoExercicio } }, tx);
    return criada;
  });
  try {
    const retorno = protegerMensagens(await consultarPacRemoto(dados.ambiente, validada.data, dados.anoExercicio), validada.data.senha);
    const execucoes = retorno.execucoesOrcamentarias?.execucaoOrcamentaria ?? [];
    await prisma.$transaction(async (tx) => {
      const salvo = await tx.siopRetorno.create({ data: {
        consultaId: consulta.id, empresaId: op.empresa.id, sucesso: retorno.sucesso,
        mensagensErro: retorno.mensagensErro === undefined ? undefined : retorno.mensagensErro as Prisma.InputJsonValue,
        execucoesPresentes: retorno.execucoesOrcamentarias !== undefined,
      } });
      // Ordem original preservada; transação integral, sem importação parcial.
      for (let inicio = 0; inicio < execucoes.length; inicio += 500) {
        await tx.siopExecucaoOrcamentariaPac.createMany({ data: execucoes.slice(inicio, inicio + 500).map((execucao, indice) => ({
          ...execucao, empresaId: op.empresa.id, retornoId: salvo.id, ordem: inicio + indice,
        })) });
      }
      await tx.siopConsulta.update({ where: { id_empresaId: { id: consulta.id, empresaId: op.empresa.id } },
        data: { status: retorno.sucesso ? "CONCLUIDA" : "RECUSADA", terminadoEm: new Date() } });
      await auditar({ empresaId: op.empresa.id, usuario: op.email, acao: "siop.retorno", objetoTipo: "SiopConsulta", objetoId: consulta.id,
        depois: { sucesso: retorno.sucesso, quantidade: execucoes.length } }, tx);
    }, { timeout: 120000 });
    return { id: consulta.id, sucesso: retorno.sucesso, quantidade: execucoes.length,
      ...(retorno.mensagensErro !== undefined ? { mensagensErro: retorno.mensagensErro } : {}) };
  } catch (erro) {
    const codigo = erro instanceof ErroSiop ? erro.codigo : "PERSISTENCIA_FALHOU";
    await prisma.$transaction(async (tx) => {
      await tx.siopConsulta.update({ where: { id_empresaId: { id: consulta.id, empresaId: op.empresa.id } },
        data: { status: "FALHOU", terminadoEm: new Date(), erroCodigo: codigo } });
      await auditar({ empresaId: op.empresa.id, usuario: op.email, acao: "siop.falhou", objetoTipo: "SiopConsulta", objetoId: consulta.id,
        depois: { codigo } }, tx);
    });
    throw new ErroSiop(codigo, "A consulta SIOP não foi concluída; confira o histórico e a configuração");
  }
}

export async function listarConsultasSiop(op: Operador, ambiente: AmbienteSiop, pagina = 1) {
  autorizar(op, false);
  const where = { empresaId: op.empresa.id, ambiente: ambienteSiopSchema.parse(ambiente) };
  return prisma.$transaction(async (tx) => ({
    total: await tx.siopConsulta.count({ where }), pagina,
    consultas: await tx.siopConsulta.findMany({ where, orderBy: [{ criadoEm: "desc" }, { id: "desc" }], skip: (pagina - 1) * 50, take: 50,
      include: { retorno: { select: { sucesso: true, mensagensErro: true, _count: { select: { execucoes: true } } } } } }),
  }));
}
export async function obterRetornoSiop(op: Operador, consultaId: string, pagina = 1) {
  autorizar(op, false);
  const consulta = await prisma.siopConsulta.findFirst({ where: { id: consultaId, empresaId: op.empresa.id }, include: { retorno: true } });
  if (!consulta) throw new ErroSiop("NAO_ENCONTRADO", "Consulta SIOP não encontrada");
  const retorno = consulta.retorno;
  if (!retorno) return { consulta, total: 0, pagina, execucoes: [] };
  const where = { empresaId: op.empresa.id, retornoId: retorno.id };
  return prisma.$transaction(async (tx) => {
    const total = await tx.siopExecucaoOrcamentariaPac.count({ where });
    const registros = await tx.siopExecucaoOrcamentariaPac.findMany({ where, orderBy: { ordem: "asc" }, skip: (pagina - 1) * 100, take: 100 });
    return { consulta, total, pagina, execucoes: registros.map((registro) => Object.fromEntries(
      Object.entries(registro).filter(([campo, valor]) => !["id", "empresaId", "retornoId", "ordem"].includes(campo) && valor !== null)
        .map(([campo, valor]) => [campo, valor instanceof Prisma.Decimal ? valor.toFixed(2) : valor]),
    )) };
  });
}
