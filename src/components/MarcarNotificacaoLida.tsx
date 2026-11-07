"use client";

import { useState, useTransition } from "react";
import { marcarLidaAction } from "@/app/acoes/notificacoes";

export default function MarcarNotificacaoLida({ id }: { id: string }) {
  const [pendente, iniciar] = useTransition();
  const [erro, mostrarErro] = useState("");
  return <div>
    <button className="secondary-button" disabled={pendente} onClick={() => iniciar(async () => {
      mostrarErro("");
      try { mostrarErro((await marcarLidaAction(id)).erro ?? ""); }
      catch { mostrarErro("Falha de conexão. Tente novamente."); }
    })}>{pendente ? "Salvando…" : "Marcar como lida"}</button>
    {erro ? <p role="alert">{erro}</p> : null}
  </div>;
}
