"use client";

import { Icone } from "@/components/ui/Icones";

export default function BuscaNavegacao({ compacto = false }: { compacto?: boolean }) {
  return <button type="button" className={compacto ? "nav-icon-button" : "navigation-search"} aria-label="Buscar demandas ou abrir uma seção" aria-haspopup="dialog" onClick={() => window.dispatchEvent(new Event("engops:abrir-busca"))}>
    <Icone nome="busca" />
    {!compacto ? <><span>Buscar ou ir para…</span><kbd>Ctrl K</kbd></> : null}
  </button>;
}
