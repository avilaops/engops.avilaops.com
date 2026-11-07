"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Sheet from "@/components/ui/Sheet";
import type { PapelMembro } from "@prisma/client";
import { navegacaoDoPapel } from "@/lib/navegacao";

type Item = { rotulo: string; href: string; atalho?: string };

/**
 * Ctrl/Cmd+K. Ir para uma tela, abrir uma demanda pelo código ou buscar.
 * Digitar "ENG-0012" abre direto; qualquer outro texto vira busca global.
 */
export default function CommandPalette({ papel }: { papel: PapelMembro }) {
  const [aberto, setAberto] = useState(false);
  const [texto, setTexto] = useState("");
  const [indice, setIndice] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const fechar = useCallback(() => setAberto(false), []);

  useEffect(() => {
    function abrir() { setAberto(true); setTexto(""); setIndice(0); }
    function tecla(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setAberto((v) => !v);
        setTexto("");
        setIndice(0);
      }
      if (e.key === "Escape") setAberto(false);
    }
    window.addEventListener("keydown", tecla);
    window.addEventListener("engops:abrir-busca", abrir);
    return () => { window.removeEventListener("keydown", tecla); window.removeEventListener("engops:abrir-busca", abrir); };
  }, []);

  useEffect(() => {
    if (!aberto) return;
    const timer = setTimeout(() => input.current?.focus(), 10);
    return () => clearTimeout(timer);
  }, [aberto]);

  const itens = useMemo<Item[]>(() => {
    const base: Item[] = [
      { rotulo: "Ver atrasadas", href: "/demandas?prazo=atrasadas" },
      { rotulo: "Prazos de hoje", href: "/demandas?prazo=hoje" },
      { rotulo: "Visão Kanban", href: "/demandas?visao=kanban" },
      ...navegacaoDoPapel(papel).flatMap((g) => g.items.map((i) => ({ rotulo: i.label, href: i.href }))),
    ];
    const t = texto.trim();
    if (!t) return base.slice(0, 12);
    const codigo = t.toUpperCase().match(/^(ENG-?)?(\d{1,6})$/);
    const busca: Item[] = [{ rotulo: `Buscar "${t}" nas demandas`, href: `/demandas?busca=${encodeURIComponent(t)}` }];
    if (codigo) busca.unshift({ rotulo: `Abrir ENG-${codigo[2].padStart(4, "0")}`, href: `/demandas/codigo/ENG-${codigo[2].padStart(4, "0")}` });
    const normalizar = (valor: string) => valor.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const n = normalizar(t);
    return [...busca, ...base.filter((i) => normalizar(i.rotulo).includes(n))].slice(0, 12);
  }, [texto, papel]);

  useEffect(() => {
    if (aberto) document.getElementById(`navigation-option-${indice}`)?.scrollIntoView({ block: "nearest" });
  }, [aberto, indice]);

  function ir(item: Item) {
    setAberto(false);
    router.push(item.href);
  }

  if (!aberto) return null;
  return (
    <Sheet titulo="Buscar e navegar" aoFechar={fechar}>
      <div className="navigation-palette">
        <label htmlFor="navigation-query" className="subtle">Busque uma seção, código ou informação da demanda</label>
        <input
          id="navigation-query"
          className="search"
          role="combobox"
          aria-expanded="true"
          aria-controls="navigation-results"
          aria-autocomplete="list"
          aria-activedescendant={itens[indice] ? `navigation-option-${indice}` : undefined}
          ref={input}
          value={texto}
          placeholder="Ir para, abrir ENG-0001, buscar..."
          onChange={(e) => { setTexto(e.target.value); setIndice(0); }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setIndice((i) => Math.min(i + 1, itens.length - 1)); }
            if (e.key === "ArrowUp") { e.preventDefault(); setIndice((i) => Math.max(i - 1, 0)); }
            if (e.key === "Enter" && itens[indice]) ir(itens[indice]);
          }}
        />
        <div className="palette-list" role="listbox" id="navigation-results" aria-label="Destinos e buscas">
          {itens.map((item, i) => (
            <div id={`navigation-option-${i}`} key={item.href + item.rotulo} role="option" aria-selected={i === indice} className="palette-item" onMouseEnter={() => setIndice(i)} onClick={() => ir(item)}>
              <span>{item.rotulo}</span>
              {item.atalho ? <small>{item.atalho}</small> : null}
            </div>
          ))}
        </div>
      </div>
    </Sheet>
  );
}
