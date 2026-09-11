"use client";

import { useActionState } from "react";
import { criarClienteAction } from "@/app/acoes/clientes";
import type { EstadoAcao } from "@/app/acoes/demandas";

export default function ClienteForm() {
  const [estado, agir, pendente] = useActionState(criarClienteAction, {} as EstadoAcao);
  return (
    <form action={agir} className="form">
      <label className="field"><span>Nome</span><input name="nome" required minLength={2} /></label>
      <div className="field-grid">
        <label className="field"><span>CNPJ / CPF</span><input name="documento" inputMode="numeric" /></label>
        <label className="field"><span>Telefone</span><input name="telefone" inputMode="tel" /></label>
      </div>
      <label className="field"><span>E-mail</span><input name="email" type="email" /></label>
      {estado.erro ? <p className="form-error">{estado.erro}</p> : null}
      {estado.ok ? <p className="form-ok">{estado.ok}</p> : null}
      <button type="submit" className="primary-button" disabled={pendente}>{pendente ? "Salvando..." : "Cadastrar"}</button>
    </form>
  );
}
