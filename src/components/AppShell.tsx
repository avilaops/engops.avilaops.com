import Link from "next/link";
import type { ReactNode } from "react";
import { Bell, ChevronRight, PanelLeft } from "lucide-react";
import MobileNav from "@/components/MobileNav";
import WorkspaceSidebar from "@/components/WorkspaceSidebar";
import ThemeToggle from "@/components/ThemeToggle";
import CommandPalette from "@/components/CommandPalette";
import { AnimatedSidebarInset, AnimatedSidebarProvider, AnimatedSidebarTrigger } from "@/components/ui/animated-sidebar";
import { navegacao, type Secao } from "@/lib/navegacao";
import type { Operador } from "@/lib/tenant";

/** Moldura compartilhada: navegação animada e conteúdo real de cada seção. */
export default function AppShell({ operador, section, children }: { operador: Operador; section: Secao; children: ReactNode }) {
  const grupo = navegacao.find((g) => g.items.some((i) => i.section === section));
  const titulo = grupo?.items.find((i) => i.section === section)?.label ?? "EngOps";
  return (
    <AnimatedSidebarProvider className="engops-frame" style={{ "--sidebar-width": "15.5rem" }}>
      <a href="#conteudo" className="skip-link">Pular para o conteúdo</a>
      <WorkspaceSidebar section={section} operador={{ nome: operador.nome, papel: operador.papel, empresa: operador.empresa.nome, dono: operador.dono && !operador.membroId }} />
      <AnimatedSidebarInset className="engops-workspace" id="conteudo" tabIndex={-1}>
        <header className="engops-toolbar">
          <div className="engops-breadcrumb">
            <AnimatedSidebarTrigger aria-label="Alternar menu" className="engops-quiet-button" title="Alternar menu (Ctrl/Cmd+B)"><PanelLeft className="size-4" /></AnimatedSidebarTrigger>
            <span className="engops-toolbar-divider" aria-hidden="true" />
            <span className="hidden text-muted-foreground sm:inline">{grupo?.label}</span>
            <ChevronRight className="hidden size-3.5 text-muted-foreground sm:block" aria-hidden="true" />
            <strong className="truncate text-xs font-medium">{titulo}</strong>
          </div>
          <div className="engops-toolbar-tools">
            <Link href="/notificacoes" className="engops-quiet-button" aria-label="Abrir notificações"><Bell className="size-4" /></Link>
            <ThemeToggle className="theme-toggle engops-quiet-button" />
          </div>
        </header>
        <div className="main-canvas">{children}</div>
      </AnimatedSidebarInset>
      <MobileNav section={section} papel={operador.papel} />
      <CommandPalette papel={operador.papel} />
    </AnimatedSidebarProvider>
  );
}
