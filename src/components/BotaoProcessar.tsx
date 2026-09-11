"use client";

import { processarAgoraAction } from "@/app/acoes/demandas";
import { Toast, useAcao } from "@/components/useAcao";

/** Só aparece quando o processador em segundo plano está desligado (desenvolvimento). */
export default function BotaoProcessar() {
  const { executar, pendente, toast } = useAcao();
  return (
    <>
      <button type="button" className="secondary-button" disabled={pendente} onClick={() => executar(processarAgoraAction)}>{pendente ? "Processando..." : "Processar fila agora"}</button>
      <Toast estado={toast} />
    </>
  );
}
