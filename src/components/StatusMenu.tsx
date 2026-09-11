"use client";

import { useState } from "react";
import type { StatusDemanda } from "@prisma/client";
import { mudarStatusAction } from "@/app/acoes/demandas";
import Sheet from "@/components/ui/Sheet";
import { Toast, useAcao } from "@/components/useAcao";
import { nomeDoStatus } from "@/dominio/demandas";

/** Mudar o estado à mão. Só oferece as transições permitidas pelo domínio. */
export default function StatusMenu({ demandaId, atual, opcoes, podeArquivar }: { demandaId: string; atual: StatusDemanda; opcoes: StatusDemanda[]; podeArquivar: boolean }) {
  const [aberto, setAberto] = useState(false);
  const { executar, pendente, toast } = useAcao();
  const lista = opcoes.filter((o) => o !== "ARQUIVADA" || podeArquivar);
  if (!lista.length) return null;
  return (
    <>
      <button type="button" className="secondary-button" onClick={() => setAberto(true)}>Mudar estado</button>
      {aberto ? (
        <Sheet titulo={`De "${nomeDoStatus(atual)}" para...`} aoFechar={() => setAberto(false)}>
          <div className="ios-list">
            {lista.map((s) => (
              <button
                key={s}
                type="button"
                className="ios-row"
                style={{ width: "100%", background: "none", border: 0, textAlign: "left", cursor: "pointer" }}
                disabled={pendente}
                onClick={() => { executar(() => mudarStatusAction(demandaId, s)); setAberto(false); }}
              >
                <span className="ios-row-label">{nomeDoStatus(s)}</span>
              </button>
            ))}
          </div>
          <p className="subtle" style={{ marginTop: 10 }}>A automação muda o estado sozinha quando conclui uma etapa. Use isto para ajustes manuais.</p>
        </Sheet>
      ) : null}
      <Toast estado={toast} />
    </>
  );
}
