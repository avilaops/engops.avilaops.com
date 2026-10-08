import type { PapelMembro } from "@prisma/client";
import { pode } from "@/lib/rbac";

/**
 * Mapa de navegação. Um só para a coluna do desktop e para a barra de abas +
 * folha "Mais" do celular. Tela nova entra aqui e aparece nos dois.
 */
export type Secao =
  | "demandas"
  | "nova-demanda"
  | "automacoes"
  | "aprovacoes"
  | "pendencias"
  | "prazos"
  | "clientes"
  | "relatorios"
  | "equipe"
  | "empresa"
  | "auditoria";

export type ItemNavegacao = { href: string; label: string; section: Secao };
export type GrupoNavegacao = { label: string; items: ItemNavegacao[] };

export const navegacao: GrupoNavegacao[] = [
  {
    label: "Operação",
    items: [
      { href: "/demandas", label: "Demandas", section: "demandas" },
      { href: "/demandas/nova", label: "Nova demanda", section: "nova-demanda" },
      { href: "/prazos", label: "Prazos", section: "prazos" },
      { href: "/pendencias", label: "Pendências", section: "pendencias" },
      { href: "/aprovacoes", label: "Aprovações", section: "aprovacoes" },
      { href: "/automacoes", label: "Automações", section: "automacoes" },
    ],
  },
  {
    label: "Gestão",
    items: [
      { href: "/clientes", label: "Clientes", section: "clientes" },
      { href: "/relatorios", label: "Relatórios", section: "relatorios" },
      { href: "/equipe", label: "Equipe", section: "equipe" },
      { href: "/empresa", label: "Empresa", section: "empresa" },
      { href: "/auditoria", label: "Auditoria", section: "auditoria" },
    ],
  },
];

const ACAO_DA_SECAO: Partial<Record<Secao, Parameters<typeof pode>[1]>> = {
  "nova-demanda": "demanda.criar",
  aprovacoes: "automacao.aprovar",
  relatorios: "relatorio.ver",
  equipe: "empresa.administrar",
  empresa: "empresa.administrar",
  auditoria: "empresa.administrar",
};

/** O menu deste papel. Esconder não é proteger: cada rota confere de novo. */
export function navegacaoDoPapel(papel: PapelMembro): GrupoNavegacao[] {
  return navegacao
    .map((g) => ({
      ...g,
      items: g.items.filter((i) => {
        const acao = ACAO_DA_SECAO[i.section];
        return !acao || pode(papel, acao);
      }),
    }))
    .filter((g) => g.items.length > 0);
}

export type AbaCelular = {
  href: string;
  label: string;
  icone: "demandas" | "prazos" | "automacoes" | "aprovacoes";
  secoes: Secao[];
};

export const abasCelular: AbaCelular[] = [
  { href: "/demandas", label: "Demandas", icone: "demandas", secoes: ["demandas", "nova-demanda"] },
  { href: "/prazos", label: "Prazos", icone: "prazos", secoes: ["prazos"] },
  { href: "/aprovacoes", label: "Aprovar", icone: "aprovacoes", secoes: ["aprovacoes", "pendencias"] },
  { href: "/automacoes", label: "Automações", icone: "automacoes", secoes: ["automacoes"] },
];

export function abasDoPapel(papel: PapelMembro): AbaCelular[] {
  return abasCelular.filter((a) => {
    const acao = ACAO_DA_SECAO[a.secoes[0]];
    return !acao || pode(papel, acao);
  });
}
