"use client";

import Image from "next/image";
import Link from "next/link";
import type { PapelMembro } from "@prisma/client";
import { Building2, ChevronsUpDown, LogOut, Search, X } from "lucide-react";
import SideNav from "@/components/SideNav";
import { nomeDoPapel } from "@/lib/rbac";
import type { Secao } from "@/lib/navegacao";
import type { ModuloEngOps } from "@/dominio/modulos";
import { AnimatedSidebar, AnimatedSidebarClose, AnimatedSidebarContent, AnimatedSidebarFooter, AnimatedSidebarHeader, AnimatedSidebarMenu, AnimatedSidebarMenuButton, AnimatedSidebarMenuItem, AnimatedSidebarRail, useAnimatedSidebar } from "@/components/ui/animated-sidebar";

export default function WorkspaceSidebar({ section, operador }: {
  section: Secao;
  operador: { nome: string; papel: PapelMembro; empresa: string; dono: boolean; modulos: ModuloEngOps[] };
}) {
  const { isMobile, setOpenMobile } = useAnimatedSidebar();
  const nome = operador.nome.split(" ")[0];
  const iniciais = operador.nome.split(" ").filter(Boolean).slice(0, 2).map((parte) => parte[0]?.toUpperCase()).join("") || "E";

  return (
    <AnimatedSidebar ariaLabel="Navegação EngOps" collapsible="icon" panelClassName="engops-sidebar-panel">
      <AnimatedSidebarHeader className="gap-4 p-3 pb-2">
        <div className="flex h-11 items-center gap-2 overflow-hidden px-1">
          <Link href="/demandas" className="flex min-w-0 flex-1 items-center gap-3" aria-label="EngOps — Demandas">
            <span className="engops-brand-icon"><Image src="/simbolo.png" alt="" width={25} height={25} /></span>
            <span className="min-w-0 group-data-[state=collapsed]/sidebar:hidden">
              <strong className="block text-sm font-semibold tracking-tight">EngOps</strong>
              <span className="block text-[10px] text-muted-foreground">Ávila Ops</span>
            </span>
          </Link>
          <AnimatedSidebarClose className="md:hidden" aria-label="Fechar menu"><X className="size-4" /></AnimatedSidebarClose>
        </div>
        <Link href="/empresas" className="engops-company-switch" aria-label={`Trocar de empresa: ${operador.empresa}`} title={operador.empresa}>
          <Building2 className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="min-w-0 flex-1 group-data-[state=collapsed]/sidebar:hidden">
            <small className="block text-[10px] text-muted-foreground">Empresa atual</small>
            <strong className="block truncate text-xs font-medium">{operador.empresa}</strong>
          </span>
          <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground group-data-[state=collapsed]/sidebar:hidden" aria-hidden="true" />
        </Link>
      </AnimatedSidebarHeader>
      <AnimatedSidebarContent>
        <AnimatedSidebarMenu className="px-1">
          <AnimatedSidebarMenuItem>
            <AnimatedSidebarMenuButton icon={<Search className="size-4" />} badge={<kbd>Ctrl K</kbd>} onSelect={() => {
              if (isMobile) setOpenMobile(false);
              requestAnimationFrame(() => window.dispatchEvent(new Event("engops:abrir-busca")));
            }}>Buscar ou ir para…</AnimatedSidebarMenuButton>
          </AnimatedSidebarMenuItem>
        </AnimatedSidebarMenu>
        <SideNav section={section} papel={operador.papel} modulos={operador.modulos} />
      </AnimatedSidebarContent>
      <AnimatedSidebarFooter className="p-3">
        <div className="flex min-h-11 items-center gap-3 overflow-hidden">
          <span className="engops-user-avatar" aria-hidden="true">{iniciais}</span>
          <div className="min-w-0 flex-1 group-data-[state=collapsed]/sidebar:hidden">
            <strong className="block truncate text-xs font-medium">{nome}</strong>
            <span className="block truncate text-[10px] text-muted-foreground">{operador.dono ? "Dono da plataforma" : nomeDoPapel(operador.papel)}</span>
          </div>
          <form action="/api/auth/logout" method="post" className="group-data-[state=collapsed]/sidebar:hidden">
            <button type="submit" className="engops-quiet-button" aria-label="Sair da conta" title="Sair"><LogOut className="size-4" /></button>
          </form>
        </div>
      </AnimatedSidebarFooter>
      <AnimatedSidebarRail />
    </AnimatedSidebar>
  );
}
