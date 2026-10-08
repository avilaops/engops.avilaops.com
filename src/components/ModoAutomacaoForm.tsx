"use client";

import { mudarModoAction } from "@/app/acoes/empresas";
import { ModoBadge } from "@/components/Badges";
import { Toast, useAcao } from "@/components/useAcao";

export default function ModoAutomacaoForm({ modo, sombraOk, dono }: { modo: "SOMBRA" | "REAL"; sombraOk: number; dono: boolean }) {
  const { executar, pendente, toast } = useAcao();
  return (
    <div className="stack">
      <div><ModoBadge modo={modo} /></div>
      <p className="muted">
        <strong>Sombra:</strong> o sistema prepara cada campo do SIMIL, RAE e SIOPI e mostra; a equipe executa à mão e confirma. Nada é enviado.<br />
        <strong>Real:</strong> o motor envia aos sistemas externos depois da aprovação. Só depois de execuções validadas em sombra e do driver liberado.
      </p>
      <p><strong>{sombraOk}</strong> execução(ões) confirmada(s) em modo sombra nesta empresa.</p>
      {modo === "SOMBRA" ? (
        <button type="button" className="secondary-button" disabled={pendente || !dono} title={dono ? "" : "Decisão do dono da plataforma"} onClick={() => { if (confirm("Ligar o modo real? O motor passará a enviar aos sistemas externos.")) executar(() => mudarModoAction("REAL")); }}>Ligar modo real</button>
      ) : (
        <button type="button" className="secondary-button" disabled={pendente} onClick={() => executar(() => mudarModoAction("SOMBRA"))}>Voltar ao modo sombra</button>
      )}
      <Toast estado={toast} />
    </div>
  );
}
