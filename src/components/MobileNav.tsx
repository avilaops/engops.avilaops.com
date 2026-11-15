"use client";

import Link from "next/link";
import type { PapelMembro } from "@prisma/client";
import { Icone } from "@/components/ui/Icones";
import { useAnimatedSidebar } from "@/components/ui/animated-sidebar";
import { abasDoPapel, type Secao } from "@/lib/navegacao";

/** As abas preservam os atalhos móveis; Mais abre a mesma navegação do desktop. */
export default function MobileNav({ section, papel }: { section: Secao; papel: PapelMembro }) {
  const { openMobile, setOpenMobile } = useAnimatedSidebar();
  const abas = abasDoPapel(papel);
  const abaAtiva = abas.find((aba) => aba.secoes.includes(section));

  return (
    <nav className="tab-bar engops-mobile-tabs" aria-label="Abas principais">
      {abas.map((aba) => {
        const ativo = abaAtiva?.href === aba.href;
        return (
          <Link href={aba.href} key={aba.href} className={ativo ? "tab-item tab-item-active" : "tab-item"} aria-current={ativo ? "page" : undefined}>
            <Icone nome={aba.icone} tamanho={22} /><span>{aba.label}</span>
          </Link>
        );
      })}
      <button type="button" className={!abaAtiva ? "tab-item tab-item-active" : "tab-item"} onClick={() => setOpenMobile(!openMobile)} aria-haspopup="dialog" aria-expanded={openMobile}>
        <Icone nome="mais" tamanho={22} /><span>Mais</span>
      </button>
    </nav>
  );
}
