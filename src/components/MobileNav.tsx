"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useState } from "react";
import type { PapelMembro } from "@prisma/client";
import ThemeToggle from "@/components/ThemeToggle";
import { Icone } from "@/components/ui/Icones";
import Sheet from "@/components/ui/Sheet";
import { abasDoPapel, navegacaoDoPapel, type Secao } from "@/lib/navegacao";
import { nomeDoPapel } from "@/lib/rbac";

export default function MobileNav({ section, operador }: { section: Secao; operador: { nome: string; papel: PapelMembro; empresa: string } }) {
  const [aberto, setAberto] = useState(false);
  const fechar = useCallback(() => setAberto(false), []);
  const abas = abasDoPapel(operador.papel);
  const grupos = navegacaoDoPapel(operador.papel);
  const abaAtiva = abas.find((a) => a.secoes.includes(section));

  return (
    <>
      <header className="mobile-topbar">
        <Link href="/demandas" className="brand-lockup" aria-label="EngOps">
          <span className="brand-mark"><Image src="/simbolo.png" alt="" width={22} height={22} /></span>
          <strong>EngOps</strong>
        </Link>
        <ThemeToggle className="theme-toggle" />
      </header>

      <nav className="tab-bar" aria-label="Abas principais">
        {abas.map((aba) => {
          const ativo = abaAtiva?.href === aba.href;
          return (
            <Link href={aba.href} key={aba.href} className={ativo ? "tab-item tab-item-active" : "tab-item"} aria-current={ativo ? "page" : undefined}>
              <Icone nome={aba.icone} tamanho={24} />
              <span>{aba.label}</span>
            </Link>
          );
        })}
        <button type="button" className={!abaAtiva ? "tab-item tab-item-active" : "tab-item"} onClick={() => setAberto(true)} aria-haspopup="dialog" aria-expanded={aberto}>
          <Icone nome="mais" tamanho={24} />
          <span>Mais</span>
        </button>
      </nav>

      {aberto ? (
        <Sheet titulo="Menu" aoFechar={fechar}>
          <div className="sheet-user">
            <span className="brand-mark" aria-hidden="true">{operador.nome[0]?.toUpperCase() ?? "E"}</span>
            <div>
              <strong>{operador.nome}</strong>
              <small>{nomeDoPapel(operador.papel)} · {operador.empresa}</small>
            </div>
            <form action="/api/auth/logout" method="post">
              <button type="submit" className="secondary-button">Sair</button>
            </form>
          </div>
          {grupos.map((grupo) => (
            <section className="sheet-group" key={grupo.label}>
              <h3 className="sheet-group-title">{grupo.label}</h3>
              <div className="ios-list">
                {grupo.items.map((item) => {
                  const ativo = item.section === section;
                  return (
                    <Link href={item.href} key={item.href} className={ativo ? "ios-row ios-row-active" : "ios-row"} aria-current={ativo ? "page" : undefined} onClick={fechar}>
                      <span className="ios-row-label">{item.label}</span>
                      <Icone nome="chevron" tamanho={16} className="chevron" />
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
          <section className="sheet-group">
            <div className="ios-list">
              <Link href="/empresas" className="ios-row" onClick={fechar}>
                <span className="ios-row-label">Trocar de empresa</span>
                <Icone nome="chevron" tamanho={16} className="chevron" />
              </Link>
            </div>
          </section>
        </Sheet>
      ) : null}
    </>
  );
}
