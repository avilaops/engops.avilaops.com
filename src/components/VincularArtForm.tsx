"use client";

import { useActionState } from "react";
import { vincularArtAction } from "@/app/acoes/art";
import type { EstadoAcao } from "@/app/acoes/demandas";

export default function VincularArtForm({ codigos, documentos }: {
  codigos: string[];
  documentos: { id: string; nomeArquivo: string; demanda: { codigo: string } }[];
}) {
  const [estado, agir, pendente] = useActionState(vincularArtAction, {} as EstadoAcao);
  return (
    <section className="panel">
      <div className="panel-title"><h2>Vincular ART registrada</h2></div>
      <p>Envie o PDF oficial como ART / RRT no dossiê de uma das demandas e recarregue esta seleção. Confira a relação de OS no anexo do CREA-SP.</p>
      {estado.ok ? <p className="form-ok" role="status">{estado.ok}</p> : null}
      {!documentos.length ? <p className="muted">Nenhum PDF de ART disponível nos dossiês selecionados.</p> : (
        <form className="form" action={agir}>
          {codigos.map((codigo) => <input type="hidden" name="codigo" value={codigo} key={codigo} />)}
          <label className="field"><span>Número do registro CREA-SP</span><input name="numero" maxLength={23} required /></label>
          <label className="field"><span>PDF oficial</span>
            <select name="documentoId" required defaultValue="">
              <option value="" disabled>Selecione o PDF</option>
              {documentos.map((doc) => <option key={doc.id} value={doc.id}>{doc.demanda.codigo} · {doc.nomeArquivo}</option>)}
            </select>
          </label>
          <label><input type="checkbox" name="confirmado" required /> Conferi que o PDF registrado relaciona todas as {codigos.length} OS selecionadas.</label>
          {estado.erro ? <p className="form-error" role="alert">{estado.erro}</p> : null}
          <button className="primary-button" disabled={pendente || !!estado.ok}>{pendente ? "Vinculando..." : "Vincular PDF às OS"}</button>
        </form>
      )}
    </section>
  );
}
