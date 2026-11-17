import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("motion/react", async (importOriginal) => {
  const original = await importOriginal<typeof import("motion/react")>();
  return { ...original, useReducedMotion: () => true };
});
import SideNav from "@/components/SideNav";
import {
  AnimatedSidebar,
  AnimatedSidebarMenuButton,
  AnimatedSidebarProvider,
  AnimatedSidebarTrigger,
  menuButtonTabIndex,
} from "@/components/ui/animated-sidebar";

function renderNavigation(papel: "ADMIN" | "OPERADOR", open = true) {
  return renderToStaticMarkup(
    <AnimatedSidebarProvider defaultOpen={open}>
      <AnimatedSidebar ariaLabel="Navegação EngOps">
        <SideNav section="demandas" papel={papel} />
      </AnimatedSidebar>
    </AnimatedSidebarProvider>,
  );
}

describe("sidebar animada do EngOps", () => {
  it("mantém os destinos reais, o estado ativo e os controles de administração", () => {
    const html = renderNavigation("ADMIN");
    expect(html).toContain('aria-label="Navegação principal"');
    expect(html).toMatch(/href="\/demandas"[^>]*aria-current="page"/);
    expect(html).toContain('href="/empresa"');
    expect(html).toContain('href="/auditoria"');
    expect(html).toContain('data-slot="sidebar-menu"');
  });

  it("preserva o filtro por papel no menu animado", () => {
    const html = renderNavigation("OPERADOR");
    expect(html).toContain('href="/demandas"');
    expect(html).not.toContain('href="/equipe"');
    expect(html).not.toContain('href="/empresa"');
    expect(html).not.toContain('href="/auditoria"');
  });

  it("mantém rótulos acessíveis quando o trilho mostra apenas ícones", () => {
    const html = renderNavigation("ADMIN", false);
    expect(html).toContain('data-state="collapsed"');
    expect(html).toContain('aria-label="Demandas"');
    expect(html).toContain('title="Demandas"');
  });

  it("respeita o estado controlado e anuncia o estado no botão", () => {
    const html = renderToStaticMarkup(
      <AnimatedSidebarProvider open={false} defaultOpen>
        <AnimatedSidebarTrigger aria-label="Alternar menu" />
      </AnimatedSidebarProvider>,
    );
    expect(html).toContain('aria-expanded="false"');
  });

  it("impede usar controles sem o provider", () => {
    expect(() => renderToStaticMarkup(<AnimatedSidebarTrigger />)).toThrow(
      "useAnimatedSidebar must be used inside AnimatedSidebarProvider",
    );
  });

  it("retira links desabilitados da ordem de tabulação", () => {
    const html = renderToStaticMarkup(
      <AnimatedSidebarProvider>
        <AnimatedSidebar>
          <AnimatedSidebarMenuButton href="/demandas" disabled>
            Demandas
          </AnimatedSidebarMenuButton>
        </AnimatedSidebar>
      </AnimatedSidebarProvider>,
    );
    expect(html).toContain('aria-disabled="true"');
    expect(html).toContain('tabindex="-1"');
  });

  it("mantém a ordem de tabulação estável entre servidor e cliente", () => {
    expect(menuButtonTabIndex(false)).toBe(0);
    expect(menuButtonTabIndex(true)).toBe(-1);
  });

  it("mantém links do menu focáveis quando o cliente reduz movimento", () => {
    const html = renderToStaticMarkup(
      <AnimatedSidebarProvider>
        <AnimatedSidebar>
          <AnimatedSidebarMenuButton href="/demandas">Demandas</AnimatedSidebarMenuButton>
        </AnimatedSidebar>
      </AnimatedSidebarProvider>,
    );
    expect(html).toMatch(/href="\/demandas"[^>]*tabindex="0"/);
  });
});
