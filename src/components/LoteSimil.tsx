"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { prepararLoteAction, previaLoteAction } from "@/app/acoes/lotes";
import type { PreviaLote, ResultadoLote } from "@/servicos/lotes";

export default function LoteSimil({ demandas }: { demandas: { id: string; codigo: string }[] }) {
  const [selecionadas, definirSelecao] = useState<string[]>([]);
  const [previa, mostrarPrevia] = useState<PreviaLote[]>([]);
  const [resultados, mostrarResultados] = useState<ResultadoLote[]>([]);
  const [erro, mostrarErro] = useState("");
  const [pendente, iniciar] = useTransition();
  const aptas = previa.filter((r) => r.estado === "pronta");
  function selecionar(ids: string[]) {
    definirSelecao(ids);
    mostrarPrevia([]);
    mostrarResultados([]);
    mostrarErro("");
  }
  return (
    <section className="panel" aria-labelledby="lote-titulo">
      <div className="panel-title"><h2 id="lote-titulo">Preparação em lote</h2><span className="subtle">Até 50 por execução</span></div>
      <p className="muted">Selecione demandas prontas. Cada cadastro será validado novamente; demandas com bloqueios ficam fora da fila. O envio externo continua sujeito à aprovação.</p>
      {!demandas.length ? <p className="muted">Nenhuma demanda pronta para processamento.</p> : (
        <fieldset disabled={pendente} className="automation-selection">
          <legend>Demandas prontas — primeiras {demandas.length}</legend>
          <label><input type="checkbox" checked={selecionadas.length === demandas.length} onChange={(e) => selecionar(e.target.checked ? demandas.map((d) => d.id) : [])} /> Selecionar todas</label>
          {demandas.map((d) => <label key={d.id}><input type="checkbox" checked={selecionadas.includes(d.id)} onChange={(e) => selecionar(e.target.checked ? [...selecionadas, d.id] : selecionadas.filter((id) => id !== d.id))} />{d.codigo}</label>)}
        </fieldset>
      )}
      <button className="secondary-button" disabled={pendente || !selecionadas.length} onClick={() => iniciar(async () => {
        mostrarErro("");
        mostrarResultados([]);
        mostrarPrevia([]);
        try {
          const resposta = await previaLoteAction(selecionadas);
          mostrarErro(resposta.erro ?? "");
          mostrarPrevia(resposta.resultados ?? []);
        } catch { mostrarErro("Não foi possível obter a prévia. Tente novamente."); }
      })}>{pendente ? "Processando…" : `Conferir ${selecionadas.length} selecionada(s)`}</button>
      {previa.length ? <div className="panel" aria-live="polite">
        <h3>Prévia: {aptas.length} apta(s), {previa.length - aptas.length} bloqueada(s)</h3>
        <p className="muted">Nenhuma preparação foi enfileirada nesta conferência. Ao confirmar, as demandas aptas serão validadas novamente.</p>
        <ul>{previa.map((r) => <li key={r.id}>{demandas.find((d) => d.id === r.id)?.codigo ?? "Demanda"}: {r.mensagem}</li>)}</ul>
      <button className="primary-button" disabled={pendente || !aptas.length} onClick={() => iniciar(async () => {
        mostrarErro("");
        mostrarResultados([]);
        try {
          const resposta = await prepararLoteAction(aptas.map((r) => r.id));
          mostrarErro(resposta.erro ?? "");
          mostrarResultados(resposta.resultados ?? []);
          if (resposta.resultados) { definirSelecao([]); mostrarPrevia([]); }
        } catch { mostrarErro("Não foi possível obter o resultado. Confira a fila antes de tentar novamente."); }
      })}>{pendente ? "Validando e enfileirando…" : `Confirmar preparação de ${aptas.length} demanda(s)`}</button>
      </div> : null}
      <div aria-live="polite">
        {erro ? <p role="alert">{erro}</p> : null}
        {resultados.length ? <ul>{resultados.map((r) => <li key={r.id}><Link href={`/demandas/${r.id}`}>{demandas.find((d) => d.id === r.id)?.codigo ?? "Demanda"}</Link>: {r.mensagem}</li>)}</ul> : null}
      </div>
    </section>
  );
}
