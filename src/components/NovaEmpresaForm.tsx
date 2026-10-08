"use client";

import { useActionState } from "react";
import { criarEmpresaAction, type EstadoAcao } from "@/app/acoes/empresas";

const inicial: EstadoAcao = {};

export default function NovaEmpresaForm() {
  const [estado, agir, pendente] = useActionState(criarEmpresaAction, inicial);
  return (
    <form action={agir} className="form">
      <label className="field">
        <span>Nome da empresa</span>
        <input name="nome" required minLength={2} maxLength={120} placeholder="Silveira Cruz Engenharia" />
      </label>
      <div className="field-grid">
        <label className="field">
          <span>CNPJ (opcional)</span>
          <input name="cnpj" inputMode="numeric" placeholder="00.000.000/0001-00" />
        </label>
        <label className="field">
          <span>Identificador (opcional)</span>
          <input name="slug" placeholder="gerado do nome" pattern="[a-z0-9-]*" />
        </label>
      </div>
      {estado.erro ? <p className="form-error">{estado.erro}</p> : null}
      <button type="submit" className="primary-button" disabled={pendente}>{pendente ? "Criando..." : "Criar empresa e entrar"}</button>
    </form>
  );
}
