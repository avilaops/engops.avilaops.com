import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import MobileNav from "@/components/MobileNav";
import SideNav from "@/components/SideNav";
import ThemeToggle from "@/components/ThemeToggle";
import CommandPalette from "@/components/CommandPalette";
import { navegacao, type Secao } from "@/lib/navegacao";
import BuscaNavegacao from "@/components/BuscaNavegacao";
import { Icone } from "@/components/ui/Icones";
import type { Operador } from "@/lib/tenant";
import { nomeDoPapel } from "@/lib/rbac";

/**
 * Moldura de toda tela logada. Desktop: coluna à esquerda. Celular: barra
 * superior + barra de abas. Os dois existem no DOM; o CSS mostra um por vez.
 */
export default function AppShell({ operador, section, children }: { operador: Operador; section: Secao; children: ReactNode }) {
  const grupo = navegacao.find((g) => g.items.some((i) => i.section === section));
  const titulo = grupo?.items.find((i) => i.section === section)?.label ?? "EngOps";
  return (
    <div className="app-frame">
      <a href="#conteudo" className="skip-link">Pular para o conteúdo</a>
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
        <BuscaNavegacao />
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

      <main className="main-canvas" id="conteudo" tabIndex={-1}>
        <div className="workspace-toolbar">
          <div className="workspace-location"><span>{grupo?.label}</span><Icone nome="chevron" tamanho={14} /><strong>{titulo}</strong></div>
          <div className="workspace-tools"><Link href="/notificacoes" className="nav-icon-button" aria-label="Abrir notificações"><Icone nome="sino" /></Link><ThemeToggle /></div>
        </div>
        {children}
      </main>
      <CommandPalette papel={operador.papel} />
    </div>
  );
}

function iniciais(nome: string): string {
  return nome.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("") || "E";
}
