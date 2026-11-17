import { CATALOGO_NR } from "@/dominio/catalogo-nr";

export type MotivoTemplateNr = "triangulo" | "diagonal" | "faixa" | "grade";
export type TemplateNr = {
  codigo: string;
  titulo: string;
  acento: string;
  acentoSuave: string;
  motivo: MotivoTemplateNr;
  indiceVisual: number;
};

const MOTIVOS: readonly MotivoTemplateNr[] = ["triangulo", "diagonal", "faixa", "grade"];

export const TEMPLATES_NR: readonly TemplateNr[] = CATALOGO_NR.map((norma, indice) => {
  const matiz = (348 + indice * 37) % 360;
  return {
    codigo: norma.codigo,
    titulo: norma.titulo,
    acento: `hsl(${matiz} 82% 39%)`,
    acentoSuave: `hsl(${matiz} 58% 92%)`,
    motivo: MOTIVOS[indice % MOTIVOS.length],
    indiceVisual: indice + 1,
  };
});

export function obterTemplateNr(codigo: string): TemplateNr {
  const numero = Number(codigo.replace(/\D/g, ""));
  const template = TEMPLATES_NR.find(item => Number(item.codigo.replace(/\D/g, "")) === numero);
  if (!template) throw new Error("Template de NR não encontrado.");
  return template;
}
