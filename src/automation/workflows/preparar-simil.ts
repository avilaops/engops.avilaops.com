import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auditar, emitirEvento } from "@/lib/auditoria";
import { EVENTOS } from "@/dominio/eventos";
import { nomeDoTipo } from "@/dominio/demandas";
import { ErroAutomacao } from "@/automation/core/erros";
import type { Workflow } from "@/automation/core/tipos";
import { executarSimil, prepararCamposSimil, resumoDosCampos, type CampoPreparado } from "@/automation/adapters/simil";
import { revalidarDemanda } from "@/servicos/validacao";
import { mudarStatus } from "@/servicos/demandas";

/**
 * Preparar → validar → mapear → prévia (pausa para aprovação) → executar.
 *
 * Em modo SOMBRA a "execução" é a confirmação de que o operador fez o SIMIL
 * à mão com os dados preparados. Em modo REAL chama o driver, que hoje não
 * existe e responde com erro honesto.
 */
export const prepararSimil: Workflow = {
  nome: "preparar-simil",
  rotulo: "Preparar SIMIL",
  naoRetentar: ["VALIDATION_BLOCKED", "MISSING_REQUIRED_DATA", "APPROVAL_REJECTED", "DRIVER_NOT_AVAILABLE", "TENANT_MISMATCH"],
  etapas: [
    {
      nome: "Carregar dados da demanda",
      async executar(amb) {
        if (!amb.demandaId) throw new ErroAutomacao("MISSING_REQUIRED_DATA", "Job sem demanda", { retentavel: false });
        const d = await prisma.demanda.findUnique({
          where: { id: amb.demandaId },
          include: { responsavel: true, documentos: { where: { removidoEm: null } } },
        });
        if (!d) throw new ErroAutomacao("MISSING_REQUIRED_DATA", "Demanda não encontrada", { retentavel: false });
        amb.contexto.codigo = d.codigo;
        await amb.registrar(`Dados carregados: ${d.codigo}, ${d.documentos.length} documento(s)`);
        return { tipo: "ok" };
      },
    },
    {
      nome: "Validar pendências e divergências",
      async executar(amb) {
        const v = await revalidarDemanda(amb.demandaId!);
        const bloqueios = v.problemas.filter((p) => p.severidade === "BLOQUEIA");
        await amb.registrar(`${v.problemas.length} problema(s), ${bloqueios.length} bloqueante(s)`);
        if (bloqueios.length) {
          await emitirEvento(amb.empresaId, EVENTOS.ValidacaoFalhou, { demandaId: amb.demandaId, jobId: amb.jobId, bloqueios: bloqueios.map((b) => b.codigo) });
          throw new ErroAutomacao("VALIDATION_BLOCKED", `${bloqueios.length} pendência(s) bloqueiam: ${bloqueios.map((b) => b.titulo).join("; ")}`, {
            retentavel: false,
            detalhes: { bloqueios },
          });
        }
        amb.contexto.camposEmRevisao = v.problemas.filter((p) => p.campo).map((p) => p.campo!);
        return { tipo: "ok" };
      },
    },
    {
      nome: "Mapear campos do SIMIL",
      async executar(amb) {
        const d = await prisma.demanda.findUnique({ where: { id: amb.demandaId! }, include: { responsavel: true } });
        if (!d) throw new ErroAutomacao("MISSING_REQUIRED_DATA", "Demanda não encontrada", { retentavel: false });
        const campos = prepararCamposSimil({
          codigo: d.codigo,
          numeroOs: d.numeroOs,
          tipoServico: nomeDoTipo(d.tipoServico),
          endereco: d.endereco,
          numero: d.numero,
          complemento: d.complemento,
          bairro: d.bairro,
          municipio: d.municipio,
          uf: d.uf,
          cep: d.cep,
          matricula: d.matricula,
          cartorio: d.cartorio,
          areaM2: d.areaM2 === null ? null : Number(d.areaM2),
          tipoImovel: d.tipoImovel,
          proprietarioNome: d.proprietarioNome,
          proprietarioDoc: d.proprietarioDoc,
          valorAvaliacao: d.valorAvaliacao === null ? null : Number(d.valorAvaliacao),
          dataVistoria: d.dataVistoria,
          responsavelNome: d.responsavel?.nome ?? null,
          camposEmRevisao: (amb.contexto.camposEmRevisao as string[]) ?? [],
        });
        const r = resumoDosCampos(campos);
        amb.contexto.campos = campos;
        amb.contexto.resumo = r;
        await amb.registrar(`${r.total} campos: ${r.validados} validados, ${r.revisar} para revisar, ${r.ausentes} ausentes`, r.ausentes ? "AVISO" : "INFO");
        if (r.ausentes > 0) {
          throw new ErroAutomacao("MISSING_REQUIRED_DATA", `${r.ausentes} campo(s) obrigatório(s) sem valor: ${campos.filter((c) => c.estado === "ausente").map((c) => c.rotulo).join(", ")}`, {
            retentavel: false,
          });
        }
        return { tipo: "ok" };
      },
    },
    {
      nome: "Gerar prévia e pedir aprovação",
      async executar(amb) {
        const campos = amb.contexto.campos as CampoPreparado[];
        const resumo = amb.contexto.resumo as Record<string, number>;

        const existente = await prisma.execucaoExterna.findFirst({ where: { jobId: amb.jobId, sistema: "SIMIL" } });
        const execucao =
          existente ??
          (await prisma.execucaoExterna.create({
            data: {
              demandaId: amb.demandaId!,
              jobId: amb.jobId,
              sistema: "SIMIL",
              modo: amb.modo,
              status: "AGUARDANDO_APROVACAO",
              dados: { campos, resumo } as Prisma.InputJsonValue,
            },
          }));
        amb.contexto.execucaoId = execucao.id;

        const aprovacao =
          (await prisma.aprovacao.findFirst({ where: { jobId: amb.jobId, status: "PENDENTE" } })) ??
          (await prisma.aprovacao.create({
            data: {
              empresaId: amb.empresaId,
              demandaId: amb.demandaId!,
              jobId: amb.jobId,
              tipo: amb.modo === "SOMBRA" ? "CONFIRMAR_SIMIL_SOMBRA" : "EXECUTAR_SIMIL",
              resumo: { ...resumo, modo: amb.modo, execucaoId: execucao.id } as Prisma.InputJsonValue,
              solicitadaPor: amb.criadoPor,
            },
          }));
        amb.contexto.aprovacaoId = aprovacao.id;

        await mudarStatus(amb.demandaId!, amb.empresaId, "SIMIL_PENDENTE", "motor", "automacao");
        await emitirEvento(amb.empresaId, EVENTOS.SIMILPreparado, { demandaId: amb.demandaId, jobId: amb.jobId, execucaoId: execucao.id, modo: amb.modo, resumo });
        await emitirEvento(amb.empresaId, EVENTOS.AprovacaoSolicitada, { demandaId: amb.demandaId, aprovacaoId: aprovacao.id, tipo: aprovacao.tipo });
        await amb.registrar(amb.modo === "SOMBRA" ? "Prévia gerada em modo sombra. Aguardando o operador confirmar a execução manual." : "Prévia gerada. Aguardando aprovação para executar.");
        return { tipo: "pausar", motivo: amb.modo === "SOMBRA" ? "aguardando confirmação do modo sombra" : "aguardando aprovação" };
      },
    },
    {
      nome: "Executar",
      async executar(amb) {
        const aprovacao = await prisma.aprovacao.findUnique({ where: { id: amb.contexto.aprovacaoId as string } });
        if (!aprovacao) throw new ErroAutomacao("APPROVAL_PENDING", "Aprovação não encontrada", { retentavel: false });
        if (aprovacao.status === "PENDENTE") return { tipo: "pausar", motivo: "aguardando aprovação" };
        if (aprovacao.status === "REJEITADA") {
          await prisma.execucaoExterna.update({ where: { id: amb.contexto.execucaoId as string }, data: { status: "CANCELADA", terminadoEm: new Date(), erroCodigo: "APPROVAL_REJECTED", erroMensagem: aprovacao.motivo } });
          await mudarStatus(amb.demandaId!, amb.empresaId, "EM_PREPARACAO", "motor", "automacao");
          throw new ErroAutomacao("APPROVAL_REJECTED", aprovacao.motivo ?? "Recusado na aprovação", { retentavel: false });
        }

        const execucaoId = amb.contexto.execucaoId as string;
        if (amb.modo === "SOMBRA") {
          await prisma.execucaoExterna.update({
            where: { id: execucaoId },
            data: {
              status: "CONCLUIDA",
              terminadoEm: new Date(),
              executadoPor: aprovacao.decididaPor,
              protocolo: (amb.contexto.protocolo as string) ?? null,
              evidencias: { modo: "SOMBRA", confirmadoPor: aprovacao.decididaPor, confirmadoEm: aprovacao.decididaEm, observacao: aprovacao.motivo } as Prisma.InputJsonValue,
            },
          });
          await amb.registrar(`Execução manual confirmada por ${aprovacao.decididaPor} (modo sombra)`);
        } else {
          await prisma.execucaoExterna.update({ where: { id: execucaoId }, data: { status: "EXECUTANDO" } });
          const campos = amb.contexto.campos as CampoPreparado[];
          try {
            const r = await executarSimil(campos);
            await prisma.execucaoExterna.update({
              where: { id: execucaoId },
              data: { status: "CONCLUIDA", terminadoEm: new Date(), protocolo: r.protocolo, executadoPor: "motor", evidencias: { modo: "REAL" } as Prisma.InputJsonValue },
            });
          } catch (e) {
            const erro = e instanceof ErroAutomacao ? e : new ErroAutomacao("UNKNOWN", String(e));
            await prisma.execucaoExterna.update({ where: { id: execucaoId }, data: { status: "FALHOU", terminadoEm: new Date(), erroCodigo: erro.codigo, erroMensagem: erro.message } });
            throw erro;
          }
        }

        await mudarStatus(amb.demandaId!, amb.empresaId, "SIMIL_CONCLUIDO", "motor", "automacao");
        await auditar({ empresaId: amb.empresaId, usuario: aprovacao.decididaPor ?? "motor", acao: "simil.concluido", objetoTipo: "Demanda", objetoId: amb.demandaId!, origem: "automacao", metadados: { jobId: amb.jobId, modo: amb.modo } });
        await emitirEvento(amb.empresaId, EVENTOS.SIMILConcluido, { demandaId: amb.demandaId, jobId: amb.jobId, execucaoId, modo: amb.modo });
        await revalidarDemanda(amb.demandaId!);
        return { tipo: "concluir", resultado: { execucaoId, modo: amb.modo } };
      },
    },
  ],
};
