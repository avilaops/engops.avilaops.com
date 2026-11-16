import type { PapelMembro } from "@prisma/client";
import { pode } from "@/lib/rbac";
import type { NomeIcone } from "@/components/ui/Icones";
import type { ModuloEngOps } from "@/dominio/modulos";

/**
 * Mapa de navegação. Um só para a coluna do desktop e para a barra de abas +
 * folha "Mais" do celular. Tela nova entra aqui e aparece nos dois.
 */
export type Secao =
  | "gov"
  | "demandas"
  | "nova-demanda"
  | "automacoes"
  | "notificacoes"
  | "aprovacoes"
  | "pendencias"
  | "prazos"
  | "clientes"
  | "relatorios"
  | "equipe"
  | "empresa"
  | "rh"
  | "sst"
  | "agenda"
  | "auditoria";

export type ItemNavegacao = { href: string; label: string; section: Secao; modulo?: ModuloEngOps };
export type GrupoNavegacao = { label: string; items: ItemNavegacao[] };

export const iconeDaSecao: Record<Secao, NomeIcone> = {
  gov: "busca",
  demandas: "demandas", "nova-demanda": "adicionar", automacoes: "automacoes",
  notificacoes: "sino", aprovacoes: "aprovacoes", pendencias: "alerta",
  prazos: "prazos", clientes: "pessoas", relatorios: "grafico", equipe: "pessoas",
  empresa: "empresa", rh: "pessoas", sst: "documento", agenda: "prazos", auditoria: "documento",
};

export const navegacao: GrupoNavegacao[] = [
  {
    label: "Operação",
    items: [
      { href: "/gov", label: "Central GOV", section: "gov" },
      { href: "/demandas", label: "Demandas", section: "demandas" },
      { href: "/demandas/nova", label: "Nova demanda", section: "nova-demanda" },
      { href: "/prazos", label: "Prazos", section: "prazos" },
      { href: "/pendencias", label: "Pendências", section: "pendencias" },
      { href: "/aprovacoes", label: "Aprovações", section: "aprovacoes" },
      { href: "/automacoes", label: "Automações", section: "automacoes" },
      { href: "/notificacoes", label: "Notificações", section: "notificacoes" },
    ],
  },
  {
    label: "Pessoas e SST",
    items: [
      { href: "/rh", label: "Recursos Humanos", section: "rh", modulo: "RH" },
      { href: "/sst", label: "Segurança do Trabalho", section: "sst", modulo: "SST" },
      { href: "/agenda", label: "Agenda", section: "agenda", modulo: "RH" },
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
export function navegacaoDoPapel(papel: PapelMembro, modulos: ReadonlyArray<ModuloEngOps> = []): GrupoNavegacao[] {
  return navegacao
    .map((g) => ({
      ...g,
      items: g.items.filter((i) => {
        if (i.modulo && !modulos.includes(i.modulo)) return false;
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
