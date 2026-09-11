"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
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

  useEffect(() => {
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
    return () => window.removeEventListener("keydown", tecla);
  }, []);

  useEffect(() => {
    if (aberto) setTimeout(() => input.current?.focus(), 10);
  }, [aberto]);

  const itens = useMemo<Item[]>(() => {
    const base: Item[] = [
      { rotulo: "Nova demanda", href: "/demandas/nova", atalho: "N" },
      { rotulo: "Ver atrasadas", href: "/demandas?prazo=atrasadas" },
      { rotulo: "Prazos de hoje", href: "/demandas?prazo=hoje" },
      { rotulo: "Visão Kanban", href: "/demandas?visao=kanban" },
      ...navegacaoDoPapel(papel).flatMap((g) => g.items.map((i) => ({ rotulo: i.label, href: i.href }))),
    ];
    const t = texto.trim();
    if (!t) return base;
    const codigo = t.toUpperCase().match(/^(ENG-?)?(\d{1,6})$/);
    const busca: Item[] = [{ rotulo: `Buscar "${t}" nas demandas`, href: `/demandas?busca=${encodeURIComponent(t)}` }];
    if (codigo) busca.unshift({ rotulo: `Abrir ENG-${codigo[2].padStart(4, "0")}`, href: `/demandas/codigo/ENG-${codigo[2].padStart(4, "0")}` });
    const n = t.toLowerCase();
    return [...busca, ...base.filter((i) => i.rotulo.toLowerCase().includes(n))];
  }, [texto, papel]);

  function ir(item: Item) {
    setAberto(false);
    router.push(item.href);
  }

  if (!aberto) return null;
  return (
    <div className="palette" role="presentation" onClick={() => setAberto(false)}>
      <div className="palette-box" role="dialog" aria-label="Comandos" onClick={(e) => e.stopPropagation()}>
        <input
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
        <div className="palette-list" role="listbox">
          {itens.slice(0, 12).map((item, i) => (
            <div key={item.href + item.rotulo} role="option" aria-selected={i === indice} className="palette-item" onMouseEnter={() => setIndice(i)} onClick={() => ir(item)}>
              <span>{item.rotulo}</span>
              {item.atalho ? <small>{item.atalho}</small> : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
