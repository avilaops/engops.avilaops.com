import type { EstadoItem, Prioridade, StatusDemanda, StatusJob } from "@prisma/client";
import { nomeDoStatus } from "@/dominio/demandas";
import { prazoRelativo } from "@/lib/formatos";

const TOM_STATUS: Partial<Record<StatusDemanda, string>> = {
  NOVA: "badge",
  AGUARDANDO_DOCUMENTOS: "badge badge-warn",
  PRONTA_PARA_PROCESSAMENTO: "badge badge-accent",
  EM_PROCESSAMENTO: "badge badge-accent",
  SIMIL_PENDENTE: "badge badge-accent",
  RAE_PENDENTE: "badge badge-accent",
  SIOPI_PENDENTE: "badge badge-accent",
  COM_DIVERGENCIA: "badge badge-bad",
  ERRO: "badge badge-bad",
  PRONTA_PARA_ENTREGA: "badge badge-good",
  ENTREGUE: "badge badge-good",
};

export function StatusBadge({ status }: { status: StatusDemanda }) {
  return <span className={TOM_STATUS[status] ?? "badge"}>{nomeDoStatus(status)}</span>;
}

export function PrioridadeBadge({ prioridade }: { prioridade: Prioridade }) {
  if (prioridade === "NORMAL") return null;
  const cls = prioridade === "URGENTE" ? "badge badge-bad" : prioridade === "ALTA" ? "badge badge-warn" : "badge";
  return <span className={cls}>{prioridade === "URGENTE" ? "Urgente" : prioridade === "ALTA" ? "Alta" : "Baixa"}</span>;
}

export function Prazo({ prazo }: { prazo: Date | string | null }) {
  const p = prazoRelativo(prazo);
  return <span className={`prazo-${p.tom}`}>{p.texto}</span>;
}

export function EstadoIcone({ estado }: { estado: EstadoItem | "validado" | "revisar" | "ausente" }) {
  const simbolo = estado === "OK" || estado === "validado" ? "✓" : estado === "REVISAR" || estado === "revisar" ? "!" : estado === "BLOQUEADO" || estado === "ausente" ? "✕" : "○";
  return <span className={`estado-icone estado-${estado}`} aria-label={estado}>{simbolo}</span>;
}

const TOM_JOB: Record<StatusJob, string> = {
  QUEUED: "badge",
  RUNNING: "badge badge-accent",
  WAITING_USER: "badge badge-warn",
  RETRYING: "badge badge-warn",
  SUCCESS: "badge badge-good",
  FAILED: "badge badge-bad",
  CANCELLED: "badge",
};
const NOME_JOB: Record<StatusJob, string> = {
  QUEUED: "Na fila",
  RUNNING: "Executando",
  WAITING_USER: "Aguardando pessoa",
  RETRYING: "Nova tentativa",
  SUCCESS: "Concluído",
  FAILED: "Falhou",
  CANCELLED: "Cancelado",
};

export function JobBadge({ status }: { status: StatusJob }) {
  return (
    <span className={TOM_JOB[status]}>
      {status === "RUNNING" ? <span className="dot pulse" /> : null}
      {NOME_JOB[status]}
    </span>
  );
}

export function ModoBadge({ modo }: { modo: "SOMBRA" | "REAL" }) {
  return <span className={modo === "SOMBRA" ? "badge badge-warn" : "badge badge-good"}>{modo === "SOMBRA" ? "Modo sombra" : "Modo real"}</span>;
}
