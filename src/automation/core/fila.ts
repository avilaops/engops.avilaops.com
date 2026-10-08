import { randomUUID } from "node:crypto";
import type { Job, NivelEvento, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { emitirEvento } from "@/lib/auditoria";
import { EVENTOS } from "@/dominio/eventos";
import { classificarErro, ErroAutomacao } from "@/automation/core/erros";
import { obterWorkflow } from "@/automation/core/registro";
import type { AmbienteEtapa, PedidoJob } from "@/automation/core/tipos";

/**
 * Fila de jobs em Postgres. Sem Redis de propósito: o volume de uma empresa de
 * engenharia é de dezenas de jobs por dia, e um `FOR UPDATE SKIP LOCKED` dá
 * concorrência segura entre workers sem mais uma peça na infra.
 *
 * Garantias:
 * - idempotência: `chaveIdempotencia` única. Clique duplo acha o job existente.
 * - retomada: `etapaAtual` avança a cada etapa concluída; worker que morre no
 *   meio deixa o lease vencer e outro continua da etapa em que estava.
 * - retry com backoff: 30s, 2min, 8min.
 * - pausa para gente: etapa devolve `pausar` e o job fica WAITING_USER até
 *   alguém chamar `retomar()`.
 */

const LEASE_MS = 90_000;
const BACKOFF_MS = [30_000, 120_000, 480_000];

export async function enfileirar(pedido: PedidoJob): Promise<{ job: Job; novo: boolean }> {
  const w = obterWorkflow(pedido.workflow);
  const existente = await prisma.job.findUnique({ where: { chaveIdempotencia: pedido.chaveIdempotencia } });
  if (existente) return { job: existente, novo: false };

  const job = await prisma.$transaction(async (tx) => {
    const criado = await tx.job.create({
      data: {
        empresaId: pedido.empresaId,
        demandaId: pedido.demandaId ?? null,
        workflow: pedido.workflow,
        modo: pedido.modo,
        prioridade: pedido.prioridade ?? 5,
        totalEtapas: w.etapas.length,
        chaveIdempotencia: pedido.chaveIdempotencia,
        contexto: (pedido.contexto ?? {}) as Prisma.InputJsonValue,
        criadoPor: pedido.criadoPor,
      },
    });
    await tx.eventoJob.create({ data: { jobId: criado.id, etapa: "fila", mensagem: `Enfileirado: ${w.rotulo}` } });
    await emitirEvento(pedido.empresaId, EVENTOS.AutomacaoIniciada, { jobId: criado.id, workflow: w.nome, demandaId: pedido.demandaId ?? null, modo: pedido.modo }, tx);
    return criado;
  });
  return { job, novo: true };
}

/** Pega um job pronto e o tranca por LEASE_MS. Null quando a fila está vazia. */
export async function reclamar(workerId: string): Promise<Job | null> {
  const agora = new Date();
  const ate = new Date(agora.getTime() + LEASE_MS);
  const linhas = await prisma.$queryRaw<Array<{ id: string }>>`
    UPDATE jobs SET status = 'RUNNING', "travadoAte" = ${ate}, "travadoPor" = ${workerId},
      "iniciadoEm" = COALESCE("iniciadoEm", ${agora}), "atualizadoEm" = ${agora}
    WHERE id = (
      SELECT id FROM jobs
      WHERE (
        (status IN ('QUEUED', 'RETRYING') AND "agendadoPara" <= ${agora})
        OR (status = 'RUNNING' AND "travadoAte" < ${agora})
      )
      ORDER BY prioridade ASC, "agendadoPara" ASC
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    )
    RETURNING id`;
  if (!linhas.length) return null;
  return prisma.job.findUnique({ where: { id: linhas[0].id } });
}

async function renovarLease(jobId: string) {
  await prisma.job.update({ where: { id: jobId }, data: { travadoAte: new Date(Date.now() + LEASE_MS) } });
}

/** Executa as etapas de um job já reclamado, da etapa atual em diante. */
export async function processar(job: Job): Promise<void> {
  const w = obterWorkflow(job.workflow);
  const contexto = (job.contexto ?? {}) as Record<string, unknown>;
  const registrar = async (mensagem: string, nivel: NivelEvento = "INFO", dados?: Record<string, unknown>) => {
    await prisma.eventoJob.create({
      data: { jobId: job.id, etapa: w.etapas[Math.min(etapa, w.etapas.length - 1)]?.nome ?? "fim", nivel, mensagem, dados: dados as Prisma.InputJsonValue | undefined },
    });
  };

  if (job.demandaId) {
    const d = await prisma.demanda.findUnique({ where: { id: job.demandaId }, select: { empresaId: true } });
    if (!d || d.empresaId !== job.empresaId) {
      await falhar(job, new ErroAutomacao("TENANT_MISMATCH", "Demanda não pertence à empresa do job", { retentavel: false }), registrar);
      return;
    }
  }

  let etapa = job.etapaAtual;
  const amb: AmbienteEtapa = {
    jobId: job.id,
    empresaId: job.empresaId,
    demandaId: job.demandaId,
    modo: job.modo,
    criadoPor: job.criadoPor,
    contexto,
    registrar,
  };

  try {
    if (etapa === 0 && job.tentativas === 0) await registrar(`Iniciada: ${w.rotulo}`);
    while (etapa < w.etapas.length) {
      const e = w.etapas[etapa];
      await registrar(`Etapa ${etapa + 1} de ${w.etapas.length}: ${e.nome}`);
      const r = await e.executar(amb);
      await renovarLease(job.id);

      if (r.tipo === "pausar") {
        // A etapa que pausou já fez o seu trabalho (gerou a prévia, pediu a
        // aprovação). Retomar continua da PRÓXIMA, senão ela pediria outra
        // aprovação a cada retomada.
        await prisma.job.update({
          where: { id: job.id },
          data: { status: "WAITING_USER", etapaAtual: etapa + 1, contexto: contexto as Prisma.InputJsonValue, travadoAte: null, travadoPor: null },
        });
        await registrar(`Pausado: ${r.motivo}`, "AVISO");
        await emitirEvento(job.empresaId, EVENTOS.AutomacaoPausada, { jobId: job.id, demandaId: job.demandaId, motivo: r.motivo });
        return;
      }

      etapa += 1;
      await prisma.job.update({ where: { id: job.id }, data: { etapaAtual: etapa, contexto: contexto as Prisma.InputJsonValue } });

      if (r.tipo === "concluir") {
        await concluir(job, r.resultado ?? {}, registrar);
        return;
      }
    }
    await concluir(job, (contexto.resultado as Record<string, unknown>) ?? {}, registrar);
  } catch (e) {
    await falhar({ ...job, etapaAtual: etapa, contexto: contexto as Prisma.JsonValue }, classificarErro(e), registrar);
  }
}

async function concluir(job: Job, resultado: Record<string, unknown>, registrar: AmbienteEtapa["registrar"]) {
  await prisma.job.update({
    where: { id: job.id },
    data: { status: "SUCCESS", terminadoEm: new Date(), resultado: resultado as Prisma.InputJsonValue, travadoAte: null, travadoPor: null },
  });
  await registrar("Processo concluído");
  await emitirEvento(job.empresaId, EVENTOS.AutomacaoConcluida, { jobId: job.id, demandaId: job.demandaId, workflow: job.workflow });
}

async function falhar(job: Job, erro: ErroAutomacao, registrar: AmbienteEtapa["registrar"]) {
  const w = obterWorkflow(job.workflow);
  const tentativas = job.tentativas + 1;
  const retenta = erro.retentavel && !(w.naoRetentar ?? []).includes(erro.codigo) && tentativas < job.maxTentativas;
  await registrar(`${erro.codigo}: ${erro.message}`, "ERRO", erro.detalhes);

  if (retenta) {
    const espera = BACKOFF_MS[Math.min(tentativas - 1, BACKOFF_MS.length - 1)];
    await prisma.job.update({
      where: { id: job.id },
      data: {
        status: "RETRYING",
        tentativas,
        etapaAtual: job.etapaAtual,
        contexto: job.contexto as Prisma.InputJsonValue,
        agendadoPara: new Date(Date.now() + espera),
        erroCodigo: erro.codigo,
        erroMensagem: erro.message,
        travadoAte: null,
        travadoPor: null,
      },
    });
    await registrar(`Nova tentativa em ${Math.round(espera / 1000)}s (${tentativas} de ${job.maxTentativas})`, "AVISO");
    return;
  }

  await prisma.job.update({
    where: { id: job.id },
    data: {
      status: "FAILED",
      tentativas,
      etapaAtual: job.etapaAtual,
      contexto: job.contexto as Prisma.InputJsonValue,
      terminadoEm: new Date(),
      erroCodigo: erro.codigo,
      erroMensagem: erro.message,
      travadoAte: null,
      travadoPor: null,
    },
  });
  await emitirEvento(job.empresaId, EVENTOS.AutomacaoFalhou, { jobId: job.id, demandaId: job.demandaId, codigo: erro.codigo, mensagem: erro.message });
}

/** Retoma um job pausado (WAITING_USER) ou falho (FAILED), da etapa em que parou. */
export async function retomar(jobId: string, empresaId: string, usuario: string, contextoExtra: Record<string, unknown> = {}): Promise<Job> {
  const job = await prisma.job.findFirst({ where: { id: jobId, empresaId } });
  if (!job) throw new Error("Job não encontrado");
  if (job.status !== "WAITING_USER" && job.status !== "FAILED") throw new Error(`Job em ${job.status} não pode ser retomado`);
  const contexto = { ...((job.contexto ?? {}) as Record<string, unknown>), ...contextoExtra };
  const atualizado = await prisma.job.update({
    where: { id: job.id },
    data: { status: "QUEUED", agendadoPara: new Date(), contexto: contexto as Prisma.InputJsonValue, erroCodigo: null, erroMensagem: null },
  });
  await prisma.eventoJob.create({ data: { jobId: job.id, etapa: "retomada", mensagem: `Retomado por ${usuario}` } });
  return atualizado;
}

export async function cancelar(jobId: string, empresaId: string, usuario: string, motivo: string): Promise<Job> {
  const job = await prisma.job.findFirst({ where: { id: jobId, empresaId } });
  if (!job) throw new Error("Job não encontrado");
  if (job.status === "SUCCESS" || job.status === "CANCELLED") return job;
  const atualizado = await prisma.job.update({
    where: { id: job.id },
    data: { status: "CANCELLED", terminadoEm: new Date(), travadoAte: null, travadoPor: null, erroCodigo: null, erroMensagem: motivo },
  });
  await prisma.eventoJob.create({ data: { jobId: job.id, etapa: "cancelamento", nivel: "AVISO", mensagem: `Cancelado por ${usuario}: ${motivo}` } });
  return atualizado;
}

/** Um ciclo do worker: reclama e processa um job. Devolve true se havia algo. */
export async function umCiclo(workerId = `worker-${randomUUID().slice(0, 8)}`): Promise<boolean> {
  const job = await reclamar(workerId);
  if (!job) return false;
  await processar(job);
  return true;
}
