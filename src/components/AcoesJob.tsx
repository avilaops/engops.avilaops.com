"use client";

import type { StatusJob } from "@prisma/client";
import { cancelarJobAction, retomarJobAction } from "@/app/acoes/demandas";
import { Toast, useAcao } from "@/components/useAcao";

export default function AcoesJob({ id, status }: { id: string; status: StatusJob }) {
  const { executar, pendente, toast } = useAcao();
  const podeRetomar = status === "FAILED" || status === "WAITING_USER";
  const podeCancelar = status !== "SUCCESS" && status !== "CANCELLED";
  return (
    <div className="page-actions">
      {podeRetomar ? <button type="button" className="primary-button" disabled={pendente} onClick={() => executar(() => retomarJobAction(id))}>Retomar da etapa atual</button> : null}
      {podeCancelar ? <button type="button" className="danger-button" disabled={pendente} onClick={() => { const m = prompt("Motivo do cancelamento:"); if (m !== null) executar(() => cancelarJobAction(id, m)); }}>Cancelar</button> : null}
      <Toast estado={toast} />
    </div>
  );
}
