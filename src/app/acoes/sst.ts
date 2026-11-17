"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { exigirOperador } from "@/lib/tenant";
import { exigirModulo } from "@/servicos/modulos";
import { podeAlterarPessoas } from "@/dominio/modulos";
import {
  atualizacaoConteudoNormaSchema,
  atualizacaoTreinamentoSchema,
  invalidacaoCertificadoSchema,
  normaSchema,
  presencaEmMassaSchema,
  treinamentoSchema,
  transicaoOrdemServicoPermitida,
  transicaoTreinamentoPermitida,
} from "@/dominio/sst";
import { calcularVencimento, ordemServicoSchema } from "@/dominio/sst";
import { auditar } from "@/lib/auditoria";
import {
  conteudoProgramaticoDaNorma,
  normaPodeEmitirCertificado,
} from "@/servicos/documentos-sst";
import { chaveCertificadoSst, persistirPdfSst } from "@/servicos/storage-sst";
import { urlDeDownload } from "@/lib/storage";
import { sincronizarCatalogoNr } from "@/servicos/bootstrap-nr";
import { obterConfiguracaoSst } from "@/servicos/configuracao-sst";
import { obterNr } from "@/dominio/catalogo-nr";
import {
  gerarPdfDeHtml,
  renderizarCertificadoHtml,
} from "@/servicos/renderizador-documentos-sst";
import { resolverImagemDocumento } from "@/servicos/imagens-documentos";
import {
  executarComRetryConcorrente,
  proximaVersaoCertificado,
} from "@/servicos/certificados-sst";
import { chaveEnvioCertificado } from "@/servicos/fila-email-sst";

async function contextoSst() {
  const op = await exigirOperador();
  await exigirModulo(op.empresa.id, "SST");
  if (!podeAlterarPessoas(op.papel))
    throw new Error("Sem permissão para alterar dados de SST.");
  return op;
}

export async function criarNormaAction(form: FormData): Promise<void> {
  const op = await contextoSst();
  const dados = normaSchema.parse(Object.fromEntries(form));
  await prisma.$transaction(async (tx) => {
    const norma = await tx.normaSst.create({ data: { ...dados, empresaId: op.empresa.id } });
    await auditar({ empresaId: op.empresa.id, usuario: op.email, acao: "sst.norma_criada", objetoTipo: "NormaSst", objetoId: norma.id, depois: norma }, tx);
  });
  revalidatePath("/sst");
}

export async function sincronizarNormasAction(): Promise<void> {
  const op = await contextoSst();
  await sincronizarCatalogoNr({
    upsert: (item) =>
      prisma.normaSst.upsert({
        where: {
          empresaId_codigo: { empresaId: op.empresa.id, codigo: item.codigo },
        },
        create: { empresaId: op.empresa.id, ...item },
        update: {
          titulo: item.titulo,
          ativo: item.ativo,
          textoReferencia: item.textoReferencia,
        },
      }),
  });
  revalidatePath("/sst");
}

export async function atualizarConteudoNormaAction(
  form: FormData,
): Promise<void> {
  const op = await contextoSst();
  const dados = atualizacaoConteudoNormaSchema.parse(Object.fromEntries(form));
  const norma = await prisma.normaSst.findFirst({
    where: { id: dados.normaId, empresaId: op.empresa.id },
  });
  if (!norma) throw new Error("Norma não encontrada nesta empresa.");
  await prisma.$transaction(async (tx) => {
    await tx.normaSst.update({
      where: { id: norma.id },
      data: { textoReferencia: dados.textoReferencia },
    });
    await auditar(
      {
        empresaId: op.empresa.id,
        usuario: op.email,
        acao: "sst.norma_conteudo_atualizado",
        objetoTipo: "NormaSst",
        objetoId: norma.id,
        antes: { textoReferencia: norma.textoReferencia },
        depois: { textoReferencia: dados.textoReferencia },
      },
      tx,
    );
  });
  revalidatePath("/sst");
  revalidatePath("/sst/templates");
}

export async function criarTreinamentoAction(form: FormData): Promise<void> {
  const op = await contextoSst();
  const dados = treinamentoSchema.parse(Object.fromEntries(form));
  if (
    !(await prisma.cliente.findFirst({
      where: { id: dados.clienteId, empresaId: op.empresa.id },
    }))
  )
    throw new Error("Empresa cliente não pertence à GRB.");
  if (
    dados.normaId &&
    !(await prisma.normaSst.findFirst({
      where: { id: dados.normaId, empresaId: op.empresa.id },
    }))
  )
    throw new Error("Norma não pertence a esta empresa.");
  await prisma.$transaction(async (tx) => {
    const treinamento = await tx.treinamentoSst.create({ data: { ...dados, normaId: dados.normaId || null, empresaId: op.empresa.id } });
    await auditar({ empresaId: op.empresa.id, usuario: op.email, acao: "sst.treinamento_criado", objetoTipo: "TreinamentoSst", objetoId: treinamento.id, depois: treinamento, metadados: { clienteId: dados.clienteId } }, tx);
  });
  revalidatePath("/sst");
  revalidatePath("/agenda");
}

export async function atualizarTreinamentoAction(
  form: FormData,
): Promise<void> {
  const op = await contextoSst();
  const dados = atualizacaoTreinamentoSchema.parse(Object.fromEntries(form));
  const atual = await prisma.treinamentoSst.findFirst({
    where: {
      id: dados.treinamentoId,
      empresaId: op.empresa.id,
      clienteId: dados.clienteId,
    },
  });
  if (!atual)
    throw new Error(
      "Treinamento não encontrado na empresa cliente selecionada.",
    );
  if (atual.status !== "PLANEJADO")
    throw new Error("Somente treinamentos planejados podem ser editados.");
  if (
    dados.normaId &&
    !(await prisma.normaSst.findFirst({
      where: { id: dados.normaId, empresaId: op.empresa.id },
    }))
  )
    throw new Error("Norma não pertence a esta empresa.");
  const { treinamentoId, clienteId, ...alteracoes } = dados;
  await prisma.$transaction(async (tx) => {
    await tx.treinamentoSst.update({
      where: { id: treinamentoId },
      data: { ...alteracoes, normaId: alteracoes.normaId || null },
    });
    await auditar(
      {
        empresaId: op.empresa.id,
        usuario: op.email,
        acao: "sst.treinamento_atualizado",
        objetoTipo: "TreinamentoSst",
        objetoId: treinamentoId,
        antes: atual,
        depois: alteracoes,
        metadados: { clienteId },
      },
      tx,
    );
  });
  revalidatePath("/sst");
  revalidatePath("/agenda");
}

export async function atualizarPresencaEmMassaAction(
  form: FormData,
): Promise<void> {
  const op = await contextoSst();
  const dados = presencaEmMassaSchema.parse(Object.fromEntries(form));
  const treinamento = await prisma.treinamentoSst.findFirst({
    where: { id: dados.treinamentoId, empresaId: op.empresa.id },
  });
  if (!treinamento || treinamento.status === "CANCELADO")
    throw new Error("Treinamento não encontrado ou cancelado.");
  const resultado =
    dados.resultado === "PRESENTE_APROVADO"
      ? { presente: true, aprovado: true }
      : dados.resultado === "PRESENTE"
        ? { presente: true, aprovado: false }
        : { presente: false, aprovado: false };
  await prisma.$transaction(async (tx) => {
    const alterados = await tx.participanteTreinamentoSst.updateMany({
      where: {
        treinamentoId: treinamento.id,
        empresaId: op.empresa.id,
        clienteId: treinamento.clienteId,
      },
      data: resultado,
    });
    await auditar(
      {
        empresaId: op.empresa.id,
        usuario: op.email,
        acao: "sst.presenca_em_massa",
        objetoTipo: "TreinamentoSst",
        objetoId: treinamento.id,
        depois: { ...resultado, alterados: alterados.count },
        metadados: { clienteId: treinamento.clienteId },
      },
      tx,
    );
  });
  revalidatePath("/sst");
}

export async function adicionarParticipanteAction(
  form: FormData,
): Promise<void> {
  const op = await contextoSst();
  const treinamentoId = String(form.get("treinamentoId"));
  const funcionarioId = String(form.get("funcionarioId"));
  const treinamento = await prisma.treinamentoSst.findFirst({
    where: { id: treinamentoId, empresaId: op.empresa.id },
  });
  const funcionario = treinamento?.clienteId
    ? await prisma.funcionarioRh.findFirst({
        where: {
          id: funcionarioId,
          empresaId: op.empresa.id,
          clienteId: treinamento.clienteId,
        },
      })
    : null;
  if (!treinamento || !treinamento.clienteId || !funcionario)
    throw new Error(
      "Treinamento e funcionário devem pertencer à mesma empresa cliente.",
    );
  if (treinamento.status === "CANCELADO")
    throw new Error(
      "Não é possível adicionar participante a treinamento cancelado.",
    );
  await prisma.$transaction(async (tx) => {
    const participante = await tx.participanteTreinamentoSst.create({ data: { empresaId: op.empresa.id, clienteId: treinamento.clienteId, treinamentoId, funcionarioId } });
    await auditar({ empresaId: op.empresa.id, usuario: op.email, acao: "sst.participante_adicionado", objetoTipo: "ParticipanteTreinamentoSst", objetoId: participante.id, depois: participante, metadados: { clienteId: treinamento.clienteId } }, tx);
  });
  revalidatePath("/sst");
}

export async function atualizarStatusTreinamentoAction(
  form: FormData,
): Promise<void> {
  const op = await contextoSst();
  const id = z.string().min(1).parse(form.get("treinamentoId"));
  const status = z
    .enum(["PLANEJADO", "REALIZADO", "CANCELADO"])
    .parse(form.get("status"));
  const atual = await prisma.treinamentoSst.findFirst({
    where: { id, empresaId: op.empresa.id },
  });
  if (!atual) throw new Error("Treinamento não encontrado.");
  if (!transicaoTreinamentoPermitida(atual.status, status))
    throw new Error("Transição de treinamento não permitida.");
  await prisma.$transaction(async (tx) => {
    await tx.treinamentoSst.update({ where: { id }, data: { status } });
    await auditar(
      {
        empresaId: op.empresa.id,
        usuario: op.email,
        acao: "sst.treinamento_status",
        objetoTipo: "TreinamentoSst",
        objetoId: id,
        antes: { status: atual.status },
        depois: { status },
        metadados: { clienteId: atual.clienteId },
      },
      tx,
    );
  });
  revalidatePath("/sst");
  revalidatePath("/agenda");
}

export async function atualizarParticipanteAction(
  form: FormData,
): Promise<void> {
  const op = await contextoSst();
  const id = String(form.get("participanteId"));
  const atual = await prisma.participanteTreinamentoSst.findFirst({
    where: { id, empresaId: op.empresa.id },
  });
  if (!atual) throw new Error("Participante não encontrado nesta empresa.");
  const dados = {
    presente: form.get("presente") === "on",
    aprovado: form.get("aprovado") === "on",
  };
  await prisma.$transaction(async (tx) => {
    await tx.participanteTreinamentoSst.update({ where: { id }, data: dados });
    await auditar(
      {
        empresaId: op.empresa.id,
        usuario: op.email,
        acao: "sst.participante_atualizado",
        objetoTipo: "ParticipanteTreinamentoSst",
        objetoId: id,
        antes: atual,
        depois: dados,
      },
      tx,
    );
  });
  revalidatePath("/sst");
}

export async function emitirCertificadoAction(form: FormData): Promise<void> {
  const op = await contextoSst();
  const participanteId = String(form.get("participanteId"));
  const participante = await prisma.participanteTreinamentoSst.findFirst({
    where: { id: participanteId, empresaId: op.empresa.id },
    include: {
      treinamento: { include: { norma: true } },
      funcionario: true,
      cliente: true,
    },
  });
  if (!participante || !participante.presente || !participante.aprovado)
    throw new Error("O certificado exige participante presente e aprovado.");
  if (participante.treinamento.status !== "REALIZADO")
    throw new Error("O certificado exige treinamento concluído.");
  if (
    participante.treinamento.norma &&
    !normaPodeEmitirCertificado(participante.treinamento.norma.codigo)
  )
    throw new Error(
      "Esta norma está revogada e não permite emissão de certificado.",
    );
  const emitidoEm = new Date();
  const venceEm = participante.treinamento.validadeMeses
    ? calcularVencimento(
        participante.treinamento.inicio,
        participante.treinamento.validadeMeses,
      )
    : null;
  const numero = `CERT-${emitidoEm.getUTCFullYear()}-${participante.id.slice(-8).toUpperCase()}`;
  const t = participante.treinamento;
  const codigoNr = t.norma?.codigo ?? "NR-01";
  const catalogo = obterNr(codigoNr);
  const configuracao = await obterConfiguracaoSst(op.empresa.id);
  const logoClienteUrl = participante.cliente?.logoChave
    ? await urlDeDownload(participante.cliente.logoChave, "logo-cliente")
    : await resolverImagemDocumento(configuracao?.logoClienteUrl);
  const html = renderizarCertificadoHtml({
    norma: codigoNr,
    participante: participante.funcionario.nome,
    cpf: participante.funcionario.cpf,
    clienteNome: participante.cliente?.nome ?? op.empresa.nome,
    clienteDocumento: participante.cliente?.documento,
    treinamento: t.titulo,
    realizadoEm: t.inicio,
    cargaHorariaMin: t.cargaHorariaMin,
    instrutor: t.instrutor ?? configuracao?.responsavelNome ?? null,
    responsavelRegistro:
      configuracao?.responsavelRegistro ?? "Registro não informado",
    logoGrbUrl: await resolverImagemDocumento(
      configuracao?.logoPrincipalUrl ?? "/grb-logo-completa.png",
    ),
    logoClienteUrl,
    conteudoProgramatico: conteudoProgramaticoDaNorma(
      t.norma?.textoReferencia,
      catalogo?.conteudoProgramatico ?? [t.titulo],
    ),
  });
  const bytes = await gerarPdfDeHtml(html);
  await persistirPdfSst({
    chave: chaveCertificadoSst(
      op.empresa.id,
      numero,
      `${emitidoEm.getTime()}-${crypto.randomUUID()}`,
    ),
    bytes,
    registrar: async (arquivoChave) =>
      executarComRetryConcorrente(() =>
        prisma.$transaction(
          async (tx) => {
            const atual = await tx.certificadoSst.findUnique({
              where: { participanteId },
            });
            const versao = proximaVersaoCertificado(atual);
            const certificado = await tx.certificadoSst.upsert({
              where: { participanteId },
              create: {
                empresaId: op.empresa.id,
                clienteId: participante.clienteId,
                participanteId,
                numero,
                emitidoEm,
                venceEm,
                arquivoChave,
                versao,
              },
              update: {
                numero,
                emitidoEm,
                venceEm,
                arquivoChave,
                versao,
                clienteId: participante.clienteId,
                status: "ATIVO",
                invalidadoEm: null,
                motivoInvalidacao: null,
              },
            });
            await tx.emissaoCertificadoSst.create({
              data: {
                empresaId: op.empresa.id,
                clienteId: participante.clienteId,
                participanteId,
                numero,
                versao,
                emitidoEm,
                venceEm,
                arquivoChave,
              },
            });
            await auditar(
              {
                empresaId: op.empresa.id,
                usuario: op.email,
                acao: "sst.certificado_emitido",
                objetoTipo: "CertificadoSst",
                objetoId: certificado.id,
                depois: {
                  numero,
                  participanteId,
                  versao,
                  venceEm,
                  arquivoChave,
                },
              },
              tx,
            );
            return arquivoChave;
          },
          { isolationLevel: "Serializable" },
        ),
      ),
  });
  revalidatePath("/sst");
  revalidatePath("/agenda");
}

export async function criarOrdemServicoAction(form: FormData): Promise<void> {
  const op = await contextoSst();
  const dados = ordemServicoSchema.parse(Object.fromEntries(form));
  if (
    !(await prisma.cliente.findFirst({
      where: { id: dados.clienteId, empresaId: op.empresa.id },
    })) ||
    !(await prisma.funcionarioRh.findFirst({
      where: {
        id: dados.funcionarioId,
        empresaId: op.empresa.id,
        clienteId: dados.clienteId,
      },
    }))
  )
    throw new Error("Funcionário não pertence à empresa cliente selecionada.");
  await prisma.$transaction(async (tx) => {
    const ordem = await tx.ordemServicoSst.create({
      data: { ...dados, epis: dados.epis || null, empresaId: op.empresa.id },
    });
    await auditar(
      {
        empresaId: op.empresa.id,
        usuario: op.email,
        acao: "sst.ordem_criada",
        objetoTipo: "OrdemServicoSst",
        objetoId: ordem.id,
        depois: dados,
      },
      tx,
    );
  });
  revalidatePath("/sst");
}

export async function atualizarStatusOrdemServicoAction(
  form: FormData,
): Promise<void> {
  const op = await contextoSst();
  const id = z.string().min(1).parse(form.get("ordemId"));
  const status = z
    .enum(["RASCUNHO", "EMITIDA", "ASSINADA", "CANCELADA"])
    .parse(form.get("status"));
  const atual = await prisma.ordemServicoSst.findFirst({
    where: { id, empresaId: op.empresa.id },
  });
  if (!atual) throw new Error("Ordem de serviço não encontrada.");
  if (!transicaoOrdemServicoPermitida(atual.status, status))
    throw new Error("Transição de ordem de serviço não permitida.");
  await prisma.$transaction(async (tx) => {
    await tx.ordemServicoSst.update({ where: { id }, data: { status } });
    await auditar(
      {
        empresaId: op.empresa.id,
        usuario: op.email,
        acao: "sst.ordem_status",
        objetoTipo: "OrdemServicoSst",
        objetoId: id,
        antes: { status: atual.status },
        depois: { status },
        metadados: { clienteId: atual.clienteId },
      },
      tx,
    );
  });
  revalidatePath("/sst");
}

export async function enviarCertificadoEmailAction(
  form: FormData,
): Promise<void> {
  const op = await contextoSst();
  const participanteId = String(form.get("participanteId"));
  const para = z.string().email().parse(form.get("para"));
  const certificado = await prisma.certificadoSst.findFirst({
    where: { participanteId, empresaId: op.empresa.id },
    include: {
      participante: {
        include: {
          funcionario: true,
          treinamento: { include: { norma: true } },
        },
      },
      empresa: true,
    },
  });
  if (!certificado)
    throw new Error("Certificado não encontrado nesta empresa.");
  if (certificado.status !== "ATIVO")
    throw new Error("Certificado invalidado não pode ser enviado.");
  await prisma.$transaction(async (tx) => {
    await tx.envioEmailSst.upsert({
      where: {
        chave: chaveEnvioCertificado(certificado.id, certificado.versao, para),
      },
      create: {
        empresaId: op.empresa.id,
        certificadoId: certificado.id,
        chave: chaveEnvioCertificado(certificado.id, certificado.versao, para),
        para: para.toLowerCase(),
      },
      update: {},
    });
    await auditar(
      {
        empresaId: op.empresa.id,
        usuario: op.email,
        acao: "sst.certificado_email_enfileirado",
        objetoTipo: "CertificadoSst",
        objetoId: certificado.id,
        metadados: { para, versao: certificado.versao },
      },
      tx,
    );
  });
  revalidatePath("/sst");
}

export async function invalidarCertificadoAction(
  form: FormData,
): Promise<void> {
  const op = await contextoSst();
  const dados = invalidacaoCertificadoSchema.parse(Object.fromEntries(form));
  const certificado = await prisma.certificadoSst.findFirst({
    where: {
      participanteId: dados.participanteId,
      empresaId: op.empresa.id,
      status: "ATIVO",
    },
  });
  if (!certificado) throw new Error("Certificado ativo não encontrado.");
  await prisma.$transaction(async (tx) => {
    const invalidadoEm = new Date();
    await tx.certificadoSst.update({
      where: { id: certificado.id },
      data: {
        status: "INVALIDADO",
        invalidadoEm,
        motivoInvalidacao: dados.motivo,
      },
    });
    await tx.emissaoCertificadoSst.updateMany({
      where: {
        participanteId: certificado.participanteId,
        versao: certificado.versao,
      },
      data: {
        status: "INVALIDADO",
        invalidadoEm,
        motivoInvalidacao: dados.motivo,
      },
    });
    await auditar(
      {
        empresaId: op.empresa.id,
        usuario: op.email,
        acao: "sst.certificado_invalidado",
        objetoTipo: "CertificadoSst",
        objetoId: certificado.id,
        antes: certificado,
        depois: {
          status: "INVALIDADO",
          versao: certificado.versao,
          motivo: dados.motivo,
        },
      },
      tx,
    );
  });
  revalidatePath("/sst");
  revalidatePath("/agenda");
}
