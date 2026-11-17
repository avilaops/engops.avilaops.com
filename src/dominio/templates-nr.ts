import { CATALOGO_NR } from "@/dominio/catalogo-nr";

export type FamiliaTemplateNr = "nr01" | "nr06" | "nr11" | "nr12" | "nr18" | "nr20";
export type TemplateNr = {
  codigo: string;
  titulo: string;
  acento: string;
  acentoSuave: string;
  familia: FamiliaTemplateNr;
  grafismo: string;
  simbolo: string;
  indiceVisual: number;
};

type IdentidadeNr = readonly [FamiliaTemplateNr, string, string, string];

// Identidades explícitas • cada tema pertence à família visual dos modelos do Guilherme.
const IDENTIDADES: readonly IdentidadeNr[] = [
  ["nr01", "#c60000", "#f7dddd", "GRO"], ["nr01", "#7d1d1d", "#f2e4e4", "REV"],
  ["nr01", "#d14b00", "#f9e7dc", "INT"], ["nr01", "#006b57", "#dcefe9", "SESMT"],
  ["nr01", "#c44277", "#f8e2eb", "CIPA"], ["nr06", "#e07900", "#fff0d9", "EPI"],
  ["nr06", "#008a86", "#daf2f0", "PCMSO"], ["nr18", "#9b5d00", "#f4ead8", "EDIF"],
  ["nr01", "#6d4bb3", "#ebe5f7", "EXPO"], ["nr12", "#e0a100", "#fff3c9", "ELETR"],
  ["nr11", "#a34b00", "#f6e5d8", "CARGA"], ["nr12", "#0077a8", "#dceef6", "MAQ"],
  ["nr12", "#9b2f38", "#f5e0e2", "PRESS"], ["nr12", "#b44716", "#f6e4dc", "FORNO"],
  ["nr01", "#735600", "#f0ead4", "INSAL"], ["nr20", "#b52020", "#f5dddd", "PERIG"],
  ["nr01", "#356f9a", "#dfebf3", "ERGO"], ["nr18", "#c43c00", "#f8e3da", "OBRA"],
  ["nr20", "#841b45", "#f2dfe7", "EXPLO"], ["nr20", "#d44800", "#fae4d8", "INFL"],
  ["nr18", "#6b7f22", "#e9eed8", "CEU"], ["nr18", "#69502f", "#ebe5dc", "MINA"],
  ["nr20", "#d21f28", "#f7dcde", "FOGO"], ["nr01", "#16806b", "#dbefe9", "CONF"],
  ["nr18", "#557054", "#e5ece4", "RES"], ["nr06", "#b88b00", "#f7efd0", "SINAL"],
  ["nr01", "#555a61", "#e8e9eb", "REV27"], ["nr01", "#273b8e", "#dfe3f3", "FISC"],
  ["nr11", "#005f88", "#d8e9f1", "PORTO"], ["nr11", "#006d78", "#d9edef", "NAVIO"],
  ["nr18", "#4c7a2c", "#e2edd9", "AGRO"], ["nr06", "#008676", "#d8f0ec", "SAUDE"],
  ["nr18", "#663399", "#e9def2", "EC"], ["nr11", "#255d76", "#dce9ef", "NAVAL"],
  ["nr18", "#d17b00", "#faecd6", "ALT"], ["nr12", "#9b354f", "#f2dfe4", "ABATE"],
  ["nr20", "#004b76", "#d9e7ef", "PLAT"], ["nr18", "#397d68", "#e0eee9", "LIMP"],
] as const;

if (IDENTIDADES.length !== CATALOGO_NR.length) throw new Error("Catálogo visual NR incompleto.");

export const TEMPLATES_NR: readonly TemplateNr[] = CATALOGO_NR.map((norma, indice) => {
  const [familia, acento, acentoSuave, simbolo] = IDENTIDADES[indice];
  return {
    codigo: norma.codigo,
    titulo: norma.titulo,
    acento,
    acentoSuave,
    familia,
    grafismo: `tema-${norma.codigo.toLowerCase()}`,
    simbolo,
    indiceVisual: indice + 1,
  };
});

export function obterTemplateNr(codigo: string): TemplateNr {
  const numero = Number(codigo.replace(/\D/g, ""));
  const template = TEMPLATES_NR.find(item => Number(item.codigo.replace(/\D/g, "")) === numero);
  if (!template) throw new Error("Template de NR não encontrado.");
  return template;
}

export function filtrarTemplatesNr(filtros: { busca?: string; situacao?: "vigente" | "revogada" }): TemplateNr[] {
  const busca = (filtros.busca ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  return TEMPLATES_NR.filter(template => {
    const numero = Number(template.codigo.replace(/\D/g, ""));
    const vigente = numero !== 2 && numero !== 27;
    if (filtros.situacao === "vigente" && !vigente) return false;
    if (filtros.situacao === "revogada" && vigente) return false;
    if (!busca) return true;
    const pesquisavel = `${template.codigo} ${numero} ${template.titulo} ${template.simbolo}`.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    return pesquisavel.includes(busca);
  });
}
