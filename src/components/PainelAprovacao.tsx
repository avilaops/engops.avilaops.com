"use client";

import { useState } from "react";
import type { Aprovacao } from "@prisma/client";
import { decidirAprovacaoAction } from "@/app/acoes/demandas";
import { Toast, useAcao } from "@/components/useAcao";

/**
 * A decisão humana. Em modo sombra a pergunta é outra: "você fez no SIMIL com
 * estes dados e bateu?". Divergência nunca é mascarada: o resumo está acima.
 */
export default function PainelAprovacao({ aprovacao, modo, podeAprovar }: { aprovacao: Aprovacao; modo: "SOMBRA" | "REAL"; demandaId: string; podeAprovar: boolean }) {
  const { executar, pendente, toast } = useAcao();
  const [motivo, setMotivo] = useState("");
  const [protocolo, setProtocolo] = useState("");
  const resumo = aprovacao.resumo as Record<string, number>;
  const sombra = modo === "SOMBRA";

  return (
    <div className="next-action" id="aprovacao" style={{ marginTop: 12, flexDirection: "column", alignItems: "stretch" }}>
      <div>
        <small>{sombra ? "Modo sombra: confirmação" : "Aprovação"}</small>
        <strong>{sombra ? "Compare os campos acima com o SIMIL e confirme a execução manual." : "Executar no SIMIL com os campos acima?"}</strong>
        <p className="muted" style={{ marginTop: 4 }}>
          {resumo.total} campos identificados · {resumo.validados} validados · {resumo.revisar ? `${resumo.revisar} precisam de revisão · ` : ""}0 ausentes
        </p>
      </div>
      {podeAprovar ? (
        <>
          <div className="field-grid">
            {sombra ? (
              <label className="field"><span>Protocolo / número gerado no SIMIL (opcional)</span><input value={protocolo} onChange={(e) => setProtocolo(e.target.value)} placeholder="cole aqui se houver" /></label>
            ) : null}
            <label className="field"><span>{sombra ? "Observação (obrigatória se recusar)" : "Motivo (obrigatório se recusar)"}</span><input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder={sombra ? "ex.: campo área veio diferente" : ""} /></label>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" className="primary-button" disabled={pendente} onClick={() => executar(() => decidirAprovacaoAction(aprovacao.id, "APROVADA", motivo, protocolo || undefined))}>
              {sombra ? "Confirmar: fiz no SIMIL e bateu" : "Aprovar e executar"}
            </button>
            <button type="button" className="danger-button" disabled={pendente} onClick={() => executar(() => decidirAprovacaoAction(aprovacao.id, "REJEITADA", motivo))}>
              {sombra ? "Não bateu: recusar" : "Recusar"}
            </button>
          </div>
        </>
      ) : (
        <p className="muted">Quem aprova: gestor, revisor ou administrador.</p>
      )}
      <Toast estado={toast} />
    </div>
  );
}
