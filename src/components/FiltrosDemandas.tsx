"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { STATUS } from "@/dominio/demandas";

const PRAZOS: Array<[string, string]> = [
  ["", "Todas"],
  ["atrasadas", "Atrasadas"],
  ["hoje", "Hoje"],
  ["amanha", "Amanhã"],
  ["semana", "Esta semana"],
  ["risco", "Em risco"],
];

/** Busca + chips. Cada mudança vira URL: filtro salvo é um favorito do navegador. */
export default function FiltrosDemandas({ atual, membros }: { atual: Record<string, string | undefined>; membros: Array<{ id: string; nome: string }> }) {
  const router = useRouter();
  const sp = useSearchParams();
  // O pai remonta este componente com `key={atual.busca}`: URL nova, campo novo.
  const [busca, setBusca] = useState(atual.busca ?? "");

  function mudar(chave: string, valor: string | null) {
    const p = new URLSearchParams(sp.toString());
    if (valor) p.set(chave, valor);
    else p.delete(chave);
    router.push(`/demandas${p.size ? `?${p}` : ""}`);
  }

  useEffect(() => {
    const t = setTimeout(() => {
      if ((atual.busca ?? "") !== busca) mudar("busca", busca || null);
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca]);

  return (
    <div className="filters">
      <input className="search" placeholder="Buscar por OS, código, proprietário, endereço, matrícula, CPF..." value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar demandas" />
      <div className="chips" role="group" aria-label="Prazo">
        {PRAZOS.map(([v, r]) => (
          <button key={v} type="button" className={(atual.prazo ?? "") === v ? "chip chip-active" : "chip"} onClick={() => mudar("prazo", v || null)}>{r}</button>
        ))}
      </div>
      <select className="chip" value={atual.status ?? ""} onChange={(e) => mudar("status", e.target.value || null)} aria-label="Estado">
        <option value="">Todos os estados</option>
        {STATUS.map(([k, r]) => <option key={k} value={k}>{r}</option>)}
      </select>
      <select className="chip" value={atual.responsavel ?? ""} onChange={(e) => mudar("responsavel", e.target.value || null)} aria-label="Responsável">
        <option value="">Qualquer responsável</option>
        {membros.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
      </select>
      <button type="button" className={atual.abertas === "nao" ? "chip chip-active" : "chip"} onClick={() => mudar("abertas", atual.abertas === "nao" ? null : "nao")}>Incluir entregues e arquivadas</button>
    </div>
  );
}
