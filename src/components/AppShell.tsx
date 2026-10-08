import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import MobileNav from "@/components/MobileNav";
import SideNav from "@/components/SideNav";
import ThemeToggle from "@/components/ThemeToggle";
import CommandPalette from "@/components/CommandPalette";
import type { Secao } from "@/lib/navegacao";
import type { Operador } from "@/lib/tenant";
import { nomeDoPapel } from "@/lib/rbac";

/**
 * Moldura de toda tela logada. Desktop: coluna à esquerda. Celular: barra
 * superior + barra de abas. Os dois existem no DOM; o CSS mostra um por vez.
 */
export default function AppShell({ operador, section, children }: { operador: Operador; section: Secao; children: ReactNode }) {
  return (
    <div className="app-frame">
      <aside className="sidebar">
        <Link href="/demandas" className="brand-lockup" aria-label="EngOps">
          <span className="brand-mark"><Image src="/simbolo.png" alt="" width={22} height={22} /></span>
          <strong>EngOps</strong>
        </Link>
        <div className="empresa-atual">
          <small>Empresa</small>
          <strong title={operador.empresa.nome}>{operador.empresa.nome}</strong>
          <Link href="/empresas">Trocar</Link>
        </div>
        <ThemeToggle />
        <SideNav section={section} papel={operador.papel} />
        <div className="sidebar-footer">
          <span className="brand-mark" aria-hidden="true">{iniciais(operador.nome)}</span>
          <div>
            <strong>{operador.nome.split(" ")[0]}</strong>
            <small>{operador.dono && !operador.membroId ? "Dono da plataforma" : nomeDoPapel(operador.papel)}</small>
          </div>
          <form action="/api/auth/logout" method="post">
            <button type="submit" className="text-button">Sair</button>
          </form>
        </div>
      </aside>

      <MobileNav section={section} operador={{ nome: operador.nome, papel: operador.papel, empresa: operador.empresa.nome }} />

      <main className="main-canvas">{children}</main>
      <CommandPalette papel={operador.papel} />
    </div>
  );
}

function iniciais(nome: string): string {
  return nome.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("") || "E";
}
