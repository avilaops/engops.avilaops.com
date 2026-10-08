"use client";

import { useActionState, useState } from "react";
import { desligarMembroAction, salvarMembroAction, type EstadoAcao } from "@/app/acoes/empresas";
import Sheet from "@/components/ui/Sheet";
import { Toast, useAcao } from "@/components/useAcao";
import { PAPEIS } from "@/lib/rbac";

type Membro = { id: string; email: string; nome: string; papel: string; papelNome: string; ativo: boolean; ultimoAcesso: string };

export default function EquipeForm({ membros, meuEmail }: { membros: Membro[]; meuEmail: string }) {
  const [editando, setEditando] = useState<Membro | null | "novo">(null);
  const { executar, pendente, toast } = useAcao();
  const [estado, agir, enviando] = useActionState(async (e: EstadoAcao, f: FormData) => {
    const r = await salvarMembroAction(e, f);
    if (r.ok) setTimeout(() => setEditando(null), 300);
    return r;
  }, {} as EstadoAcao);
  const m = editando && editando !== "novo" ? editando : null;

  return (
    <>
      <button type="button" className="primary-button full" onClick={() => setEditando("novo")} style={{ marginBottom: 12 }}>+ Incluir pessoa</button>
      <div className="ios-list">
        {membros.map((x) => (
          <button type="button" key={x.id} className="ios-row" style={{ width: "100%", background: "none", border: 0, borderTop: "1px solid var(--line-soft)", textAlign: "left", cursor: "pointer", opacity: x.ativo ? 1 : 0.5 }} onClick={() => setEditando(x)}>
            <span className="ios-row-label"><strong>{x.nome}</strong><small>{x.email} · {x.papelNome}{x.ultimoAcesso ? ` · acesso ${x.ultimoAcesso}` : " · nunca entrou"}{x.ativo ? "" : " · desligado"}</small></span>
          </button>
        ))}
      </div>
      <Toast estado={toast} />
      {editando ? (
        <Sheet titulo={m ? `Editar ${m.nome}` : "Incluir pessoa"} aoFechar={() => setEditando(null)}>
          <form action={agir} className="form">
            <label className="field"><span>E-mail (o do login único)</span><input name="email" type="email" required defaultValue={m?.email ?? ""} readOnly={!!m} /></label>
            <label className="field"><span>Nome</span><input name="nome" required minLength={2} defaultValue={m?.nome ?? ""} /></label>
            <label className="field"><span>Papel</span>
              <select name="papel" defaultValue={m?.papel ?? "OPERADOR"}>{PAPEIS.map(([k, r]) => <option key={k} value={k}>{r}</option>)}</select>
            </label>
            {estado.erro ? <p className="form-error">{estado.erro}</p> : null}
            {estado.ok ? <p className="form-ok">{estado.ok}</p> : null}
            <button type="submit" className="primary-button" disabled={enviando}>{enviando ? "Salvando..." : "Salvar"}</button>
            {m && m.ativo && m.email !== meuEmail ? (
              <button type="button" className="danger-button" disabled={pendente} onClick={() => { executar(() => desligarMembroAction(m.id)); setEditando(null); }}>Desligar acesso</button>
            ) : null}
          </form>
        </Sheet>
      ) : null}
    </>
  );
}
