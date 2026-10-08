import type { CategoriaDocumento } from "@prisma/client";

/** As pastas do dossiê, na ordem em que aparecem. */
export const CATEGORIAS: ReadonlyArray<{ chave: CategoriaDocumento; pasta: string; rotulo: string }> = [
  { chave: "ENTRADA", pasta: "01-Entrada", rotulo: "Entrada" },
  { chave: "IMOVEL", pasta: "02-Imovel", rotulo: "Imóvel" },
  { chave: "PROPRIETARIO", pasta: "03-Proprietario", rotulo: "Proprietário" },
  { chave: "LAUDOS", pasta: "04-Laudos", rotulo: "Laudos" },
  { chave: "SIMIL", pasta: "05-SIMIL", rotulo: "SIMIL" },
  { chave: "RAE", pasta: "06-RAE", rotulo: "RAE" },
  { chave: "SIOPI", pasta: "07-SIOPI", rotulo: "SIOPI" },
  { chave: "ENTREGA", pasta: "08-Entrega", rotulo: "Entrega" },
  { chave: "AUDITORIA", pasta: "09-Auditoria", rotulo: "Auditoria" },
];

export function pastaDaCategoria(c: CategoriaDocumento): string {
  return CATEGORIAS.find((x) => x.chave === c)?.pasta ?? c;
}

export function rotuloDaCategoria(c: CategoriaDocumento): string {
  return CATEGORIAS.find((x) => x.chave === c)?.rotulo ?? c;
}

/** Tipos reconhecidos, com a pasta natural de cada um. */
export const TIPOS_DOCUMENTO: ReadonlyArray<{ tipo: string; rotulo: string; categoria: CategoriaDocumento; obrigatorio?: true }> = [
  { tipo: "OS", rotulo: "Ordem de Serviço", categoria: "ENTRADA", obrigatorio: true },
  { tipo: "MATRICULA", rotulo: "Matrícula do imóvel", categoria: "IMOVEL", obrigatorio: true },
  { tipo: "IPTU", rotulo: "IPTU / ITR", categoria: "IMOVEL" },
  { tipo: "PLANTA", rotulo: "Planta / projeto", categoria: "IMOVEL" },
  { tipo: "FOTO", rotulo: "Fotos do imóvel", categoria: "IMOVEL" },
  { tipo: "DOC_PROPRIETARIO", rotulo: "Documento do proprietário (RG/CNH/CPF)", categoria: "PROPRIETARIO", obrigatorio: true },
  { tipo: "CONTRATO", rotulo: "Contrato / compromisso", categoria: "PROPRIETARIO" },
  { tipo: "LAUDO", rotulo: "Laudo", categoria: "LAUDOS" },
  { tipo: "ART", rotulo: "ART / RRT", categoria: "LAUDOS" },
  { tipo: "SIMIL_COMPROVANTE", rotulo: "Comprovante SIMIL", categoria: "SIMIL" },
  { tipo: "RAE", rotulo: "RAE", categoria: "RAE" },
  { tipo: "SIOPI_COMPROVANTE", rotulo: "Comprovante SIOPI", categoria: "SIOPI" },
  { tipo: "PACOTE_FINAL", rotulo: "Pacote final", categoria: "ENTREGA" },
  { tipo: "OUTRO", rotulo: "Outro", categoria: "ENTRADA" },
];

export function categoriaDoTipo(tipo: string): CategoriaDocumento {
  return TIPOS_DOCUMENTO.find((t) => t.tipo === tipo)?.categoria ?? "ENTRADA";
}

export function rotuloDoTipo(tipo: string): string {
  return TIPOS_DOCUMENTO.find((t) => t.tipo === tipo)?.rotulo ?? tipo;
}

/**
 * Palpite de tipo pelo nome do arquivo. É só sugestão para o formulário: a
 * pessoa confirma. Sem palpite, devolve null e o campo fica em branco.
 */
export function sugerirTipo(nomeArquivo: string): string | null {
  const n = nomeArquivo.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const regras: Array<[RegExp, string]> = [
    [/ordem.?de.?servico|\bos[-_ ]?\d|^os\b/, "OS"],
    [/matricula|certidao.*(imovel|registro)|\bri\b/, "MATRICULA"],
    [/iptu|itr\b/, "IPTU"],
    [/planta|projeto|croqui/, "PLANTA"],
    [/foto|img_|image|\.jpe?g$|\.heic$/, "FOTO"],
    [/\brg\b|cnh|cpf|identidade|cin\b/, "DOC_PROPRIETARIO"],
    [/contrato|compromisso|escritura/, "CONTRATO"],
    [/laudo|avaliacao|vistoria/, "LAUDO"],
    [/\bart\b|\brrt\b/, "ART"],
    [/simil/, "SIMIL_COMPROVANTE"],
    [/\brae\b/, "RAE"],
    [/siopi/, "SIOPI_COMPROVANTE"],
  ];
  for (const [re, tipo] of regras) if (re.test(n)) return tipo;
  return null;
}

const MIMES_ACEITOS = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/heic",
  "image/webp",
  "application/zip",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "application/vnd.ms-excel",
  "text/plain",
]);

export const TAMANHO_MAXIMO = 40 * 1024 * 1024;

export function mimeAceito(mime: string): boolean {
  return MIMES_ACEITOS.has(mime);
}

/** ENG-0001_02-Imovel_MATRICULA_v2.pdf */
export function nomePadronizado(codigo: string, categoria: CategoriaDocumento, tipo: string, versao: number, nomeOriginal: string): string {
  const ext = (nomeOriginal.match(/\.[a-z0-9]{1,5}$/i)?.[0] ?? "").toLowerCase();
  return `${codigo}_${pastaDaCategoria(categoria)}_${tipo}_v${versao}${ext}`;
}

/** Campos que o operador confere num documento e que o validador cruzado compara com o cadastro. */
export const CAMPOS_CONFERIVEIS: ReadonlyArray<{ chave: string; rotulo: string; tipos: string[] }> = [
  { chave: "proprietarioNome", rotulo: "Nome do proprietário", tipos: ["MATRICULA", "DOC_PROPRIETARIO", "CONTRATO", "OS"] },
  { chave: "proprietarioDoc", rotulo: "CPF/CNPJ do proprietário", tipos: ["MATRICULA", "DOC_PROPRIETARIO", "CONTRATO", "OS"] },
  { chave: "matricula", rotulo: "Número da matrícula", tipos: ["MATRICULA", "OS", "IPTU"] },
  { chave: "areaM2", rotulo: "Área (m²)", tipos: ["MATRICULA", "OS", "IPTU", "PLANTA", "LAUDO"] },
  { chave: "endereco", rotulo: "Endereço", tipos: ["MATRICULA", "OS", "IPTU", "DOC_PROPRIETARIO"] },
  { chave: "numeroOs", rotulo: "Número da OS", tipos: ["OS"] },
];
