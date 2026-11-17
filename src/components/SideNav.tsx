"use client";

import type { PapelMembro } from "@prisma/client";
import { Bell, Building2, CalendarClock, ChartNoAxesCombined, CircleCheck, ClipboardList, FileClock, Plus, TriangleAlert, UsersRound, Workflow, type LucideIcon } from "lucide-react";
import { navegacaoDoPapel, type Secao } from "@/lib/navegacao";
import type { ModuloEngOps } from "@/dominio/modulos";
import { AnimatedSidebarGroup, AnimatedSidebarGroupContent, AnimatedSidebarGroupLabel, AnimatedSidebarMenu, AnimatedSidebarMenuButton, AnimatedSidebarMenuItem } from "@/components/ui/animated-sidebar";

const icones: Record<Secao, LucideIcon> = {
  gov: Building2,
  demandas: ClipboardList, "nova-demanda": Plus, automacoes: Workflow,
  notificacoes: Bell, aprovacoes: CircleCheck, pendencias: TriangleAlert,
  prazos: CalendarClock, clientes: UsersRound, relatorios: ChartNoAxesCombined,
  equipe: UsersRound, empresa: Building2, rh: UsersRound, sst: ClipboardList, agenda: CalendarClock, auditoria: FileClock,
};

export default function SideNav({ section, papel, modulos = [] }: { section: Secao; papel: PapelMembro; modulos?: ModuloEngOps[] }) {
  const grupos = navegacaoDoPapel(papel, modulos);
  return (
    <nav aria-label="Navegação principal">
      {grupos.map((group) => (
        <AnimatedSidebarGroup key={group.label}>
          <AnimatedSidebarGroupLabel>{group.label}</AnimatedSidebarGroupLabel>
          <AnimatedSidebarGroupContent>
            <AnimatedSidebarMenu>
              {group.items.map((item) => {
                const Icon = icones[item.section];
                return (
                  <AnimatedSidebarMenuItem key={item.href}>
                    <AnimatedSidebarMenuButton href={item.href} isActive={item.section === section} icon={<Icon className="size-4" />}>
                      {item.label}
                    </AnimatedSidebarMenuButton>
                  </AnimatedSidebarMenuItem>
                );
              })}
            </AnimatedSidebarMenu>
          </AnimatedSidebarGroupContent>
        </AnimatedSidebarGroup>
      ))}
    </nav>
  );
}
