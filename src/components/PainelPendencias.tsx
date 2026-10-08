"use client";

import { useActionState, useState } from "react";
import type { Pendencia } from "@prisma/client";
import { abrirPendenciaAction, resolverPendenciaAction, type EstadoAcao } from "@/app/acoes/demandas";
import { EstadoIcone } from "@/components/Badges";
import Sheet from "@/components/ui/Sheet";
import { Toast, useAcao } from "@/components/useAcao";

export default function PainelPendencias({ demandaId, pendencias, podeResolver }: { demandaId: string; pendencias: Pendencia[]; podeResolver: boolean }) {
  const { executar, pendente, toast } = useAcao();
  const [abrir, setAbrir] = useState(false);
  const acao = abrirPendenciaAction.bind(null, demandaId);
  const [estadoForm, agir, enviando] = useActionState(acao, {} as EstadoAcao);
  const bloqueios = pendencias.filter((p) => p.severidade === "BLOQUEIA");
  const avisos = pendencias.filter((p) => p.severidade === "AVISO");

  return (
    <section className="panel" id="pendencias">
      <div className="panel-title">
        <h2>Pendências</h2>
        {podeResolver ? <button type="button" className="row-action" onClick={() => setAbrir(true)}>+ Abrir</button> : null}
      </div>
      {!pendencias.length ? <p className="muted">Nenhuma pendência. A demanda está pronta para a próxima etapa.</p> : null}
      {[...bloqueios, ...avisos].map((p) => (
        <div className="issue" key={p.id}>
          <EstadoIcone estado={p.severidade === "BLOQUEIA" ? "BLOQUEADO" : "REVISAR"} />
          <div className="issue-body">
            <strong>{p.titulo}</strong>
            {p.detalhe ? <pre>{p.detalhe}</pre> : null}
            <small className="subtle">{p.origem === "CRUZADO" ? "validador cruzado" : p.origem === "MANUAL" ? "aberta à mão" : p.origem === "AUTOMACAO" ? "automação" : "detector"} · {p.codigo}</small>
          </div>
          {podeResolver && (p.origem === "MANUAL" || p.origem === "CRUZADO" || p.origem === "AUTOMACAO") ? (
            <button type="button" className="row-action" disabled={pendente} onClick={() => executar(() => resolverPendenciaAction(p.id, demandaId))}>Resolvida</button>
          ) : null}
        </div>
      ))}
      {bloqueios.some((p) => p.origem === "DETECTOR") ? <p className="subtle" style={{ marginTop: 8 }}>Pendência de cadastro ou documento some sozinha quando o dado entra.</p> : null}
      <Toast estado={toast} />

      {abrir ? (
        <Sheet titulo="Abrir pendência" aoFechar={() => setAbrir(false)}>
          <form action={agir} className="form" onSubmit={() => setTimeout(() => setAbrir(false), 400)}>
            <label className="field"><span>O que está pendente</span><input name="titulo" required minLength={3} placeholder="ex.: cliente vai mandar a matrícula atualizada" /></label>
            <label className="field"><span>Gravidade</span>
              <select name="severidade" defaultValue="AVISO"><option value="AVISO">Aviso (não bloqueia)</option><option value="BLOQUEIA">Bloqueia a automação</option></select>
            </label>
            {estadoForm.erro ? <p className="form-error">{estadoForm.erro}</p> : null}
            <button type="submit" className="primary-button" disabled={enviando}>Abrir</button>
          </form>
        </Sheet>
      ) : null}
    </section>
  );
}
