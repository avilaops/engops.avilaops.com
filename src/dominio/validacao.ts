import type { Severidade } from "@prisma/client";
import { TIPOS_DOCUMENTO } from "@/dominio/documentos";

/**
 * Detector de pendências e validador cruzado. Puro: recebe o retrato da
 * demanda e devolve a lista de problemas. Quem grava é `src/servicos/validacao.ts`.
 *
 * O objetivo é descobrir o problema ANTES da automação, não no meio dela.
 */

export type RetratoDemanda = {
  numeroOs: string | null;
  endereco: string | null;
  numero: string | null;
  municipio: string | null;
  uf: string | null;
  cep: string | null;
  matricula: string | null;
  areaM2: number | null;
  tipoImovel: string | null;
  proprietarioNome: string | null;
  proprietarioDoc: string | null;
  prazo: Date | null;
  documentos: Array<{ id: string; tipo: string; nomeArquivo: string; dados: Record<string, unknown> | null }>;
};

export type Problema = {
  codigo: string;
  severidade: Severidade;
  titulo: string;
  detalhe?: string;
  campo?: string;
  origem: "DETECTOR" | "CRUZADO";
};

export function validarCpfCnpj(doc: string): boolean {
  const d = doc.replace(/\D/g, "");
  if (d.length === 11) return validarCpf(d);
  if (d.length === 14) return validarCnpj(d);
  return false;
}

function validarCpf(d: string): boolean {
  if (/^(\d)\1{10}$/.test(d)) return false;
  const calc = (n: number) => {
    let s = 0;
    for (let i = 0; i < n; i++) s += Number(d[i]) * (n + 1 - i);
    const r = (s * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return calc(9) === Number(d[9]) && calc(10) === Number(d[10]);
}

function validarCnpj(d: string): boolean {
  if (/^(\d)\1{13}$/.test(d)) return false;
  const calc = (n: number) => {
    const pesos = n === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let s = 0;
    for (let i = 0; i < n; i++) s += Number(d[i]) * pesos[i];
    const r = s % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return calc(12) === Number(d[12]) && calc(13) === Number(d[13]);
}

/** Pendências de cadastro e de documentos obrigatórios. */
export function detectarPendencias(r: RetratoDemanda): Problema[] {
  const p: Problema[] = [];
  const falta = (campo: keyof RetratoDemanda, codigo: string, titulo: string, severidade: Severidade = "BLOQUEIA") => {
    const v = r[campo];
    if (v === null || v === undefined || (typeof v === "string" && v.trim() === "")) {
      p.push({ codigo, severidade, titulo, campo, origem: "DETECTOR" });
    }
  };

  falta("numeroOs", "OS_AUSENTE", "Número da OS não informado");
  falta("endereco", "ENDERECO_INCOMPLETO", "Endereço do imóvel não informado");
  falta("municipio", "ENDERECO_INCOMPLETO", "Município não informado");
  falta("uf", "ENDERECO_INCOMPLETO", "UF não informada");
  falta("matricula", "MATRICULA_AUSENTE", "Matrícula do imóvel não informada");
  falta("areaM2", "AREA_AUSENTE", "Área do imóvel não informada");
  falta("proprietarioNome", "PROPRIETARIO_AUSENTE", "Nome do proprietário não informado");
  falta("proprietarioDoc", "CPF_AUSENTE", "CPF/CNPJ do proprietário não informado");
  falta("cep", "CEP_AUSENTE", "CEP não informado", "AVISO");
  falta("tipoImovel", "TIPO_IMOVEL_AUSENTE", "Tipo do imóvel não informado", "AVISO");
  falta("prazo", "PRAZO_AUSENTE", "Demanda sem prazo", "AVISO");

  if (r.proprietarioDoc && !validarCpfCnpj(r.proprietarioDoc)) {
    p.push({
      codigo: "CPF_INVALIDO",
      severidade: "BLOQUEIA",
      titulo: "CPF/CNPJ do proprietário inválido",
      detalhe: `Dígito verificador não confere: ${r.proprietarioDoc}`,
      campo: "proprietarioDoc",
      origem: "DETECTOR",
    });
  }
  if (r.areaM2 !== null && r.areaM2 <= 0) {
    p.push({ codigo: "AREA_INVALIDA", severidade: "BLOQUEIA", titulo: "Área precisa ser maior que zero", campo: "areaM2", origem: "DETECTOR" });
  }
  if (r.cep && !/^\d{5}-?\d{3}$/.test(r.cep)) {
    p.push({ codigo: "CEP_INVALIDO", severidade: "AVISO", titulo: "CEP fora do formato 00000-000", campo: "cep", origem: "DETECTOR" });
  }

  const tiposPresentes = new Set(r.documentos.map((d) => d.tipo));
  for (const t of TIPOS_DOCUMENTO) {
    if (t.obrigatorio && !tiposPresentes.has(t.tipo)) {
      p.push({
        codigo: `DOC_${t.tipo}_AUSENTE`,
        severidade: "BLOQUEIA",
        titulo: `Falta o documento: ${t.rotulo}`,
        origem: "DETECTOR",
      });
    }
  }

  return p;
}

function normalizarNome(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Sem preposições: "João da Silva" e "João Silva" são a mesma pessoa escrita de dois jeitos. */
function nomeEssencial(s: string): string {
  return normalizarNome(s).replace(/\b(de|da|do|das|dos|e)\b/g, " ").replace(/\s+/g, " ").trim();
}

function normalizarDoc(s: string): string {
  return s.replace(/\D/g, "");
}

function normalizarMatricula(s: string): string {
  return s.replace(/[^0-9]/g, "").replace(/^0+/, "");
}

/**
 * Compara o cadastro com o que foi conferido em cada documento. Diferença de
 * nome com mesmas iniciais é aviso (João da Silva x João Silva); documento,
 * matrícula e área diferentes bloqueiam.
 */
export function validarCruzado(r: RetratoDemanda): Problema[] {
  const p: Problema[] = [];
  const comparacoes = [
    { chave: "proprietarioDoc", rotulo: "CPF/CNPJ", cadastro: r.proprietarioDoc, norm: normalizarDoc, severidade: "BLOQUEIA" as Severidade },
    { chave: "matricula", rotulo: "Matrícula", cadastro: r.matricula, norm: normalizarMatricula, severidade: "BLOQUEIA" as Severidade },
    { chave: "numeroOs", rotulo: "Número da OS", cadastro: r.numeroOs, norm: (s: string) => s.replace(/\D/g, ""), severidade: "BLOQUEIA" as Severidade },
  ];

  for (const doc of r.documentos) {
    if (!doc.dados) continue;

    // Nome: igual → nada; igual sem preposições → aviso; diferente → bloqueia.
    const nomeDoc = doc.dados.proprietarioNome;
    if (typeof nomeDoc === "string" && nomeDoc.trim() && r.proprietarioNome && normalizarNome(nomeDoc) !== normalizarNome(r.proprietarioNome)) {
      const leve = nomeEssencial(nomeDoc) === nomeEssencial(r.proprietarioNome);
      p.push({
        codigo: "DIVERGENCIA_PROPRIETARIONOME",
        severidade: leve ? "AVISO" : "BLOQUEIA",
        titulo: `Nome do proprietário diverge entre cadastro e ${doc.nomeArquivo}`,
        detalhe: `Cadastro: ${r.proprietarioNome}\nDocumento: ${nomeDoc}${leve ? "\n(só preposição; confira se é a mesma pessoa)" : ""}`,
        campo: "proprietarioNome",
        origem: "CRUZADO",
      });
    }

    for (const c of comparacoes) {
      const valorDoc = doc.dados[c.chave];
      if (typeof valorDoc !== "string" || !valorDoc.trim() || !c.cadastro) continue;
      if (c.norm(valorDoc) !== c.norm(c.cadastro)) {
        p.push({
          codigo: `DIVERGENCIA_${c.chave.toUpperCase()}`,
          severidade: c.severidade,
          titulo: `${c.rotulo} diverge entre cadastro e ${doc.nomeArquivo}`,
          detalhe: `Cadastro: ${c.cadastro}\nDocumento: ${valorDoc}`,
          campo: c.chave,
          origem: "CRUZADO",
        });
      }
    }

    const areaDoc = doc.dados.areaM2;
    const areaNum = typeof areaDoc === "number" ? areaDoc : typeof areaDoc === "string" ? Number(areaDoc.replace(/\./g, "").replace(",", ".")) : NaN;
    if (!Number.isNaN(areaNum) && r.areaM2 !== null && Math.abs(areaNum - r.areaM2) > 0.005) {
      p.push({
        codigo: "DIVERGENCIA_AREA",
        severidade: "BLOQUEIA",
        titulo: `Área diverge entre cadastro e ${doc.nomeArquivo}`,
        detalhe: `Cadastro: ${r.areaM2.toFixed(2)} m²\nDocumento: ${areaNum.toFixed(2)} m²`,
        campo: "areaM2",
        origem: "CRUZADO",
      });
    }
  }

  return p;
}

export function validarTudo(r: RetratoDemanda): Problema[] {
  return [...detectarPendencias(r), ...validarCruzado(r)];
}

export function pronta(problemas: Problema[]): boolean {
  return !problemas.some((p) => p.severidade === "BLOQUEIA");
}
