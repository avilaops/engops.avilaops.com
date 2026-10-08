import { ErroAutomacao } from "@/automation/core/erros";
import { mascararDocumento } from "@/lib/formatos";

/**
 * Adapter SIMIL. Sabe traduzir uma demanda nos campos que o formulário do
 * SIMIL pede, e é o ÚNICO lugar que sabe isso. O motor não conhece nenhum
 * destes nomes.
 *
 * O mapa de campos abaixo é a nossa melhor leitura do que o SIMIL pede numa
 * avaliação de imóvel. Ele será conferido campo a campo contra o sistema real
 * na Fase 5 (é a primeira coisa de `docs/ROADMAP.md`, "informações a obter").
 * Até lá, o modo sombra mostra exatamente isto ao operador, que compara com a
 * tela do SIMIL e corrige o mapa se algo estiver fora.
 */

export type EstadoCampo = "validado" | "revisar" | "ausente";

export type CampoPreparado = {
  campo: string;
  rotulo: string;
  valor: string;
  origem: string;
  estado: EstadoCampo;
  observacao?: string;
};

export type FonteSimil = {
  codigo: string;
  numeroOs: string | null;
  tipoServico: string;
  endereco: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  municipio: string | null;
  uf: string | null;
  cep: string | null;
  matricula: string | null;
  cartorio: string | null;
  areaM2: number | null;
  tipoImovel: string | null;
  proprietarioNome: string | null;
  proprietarioDoc: string | null;
  valorAvaliacao: number | null;
  dataVistoria: Date | null;
  responsavelNome: string | null;
  camposEmRevisao: string[];
};

const fmtData = (d: Date | null) => (d ? d.toLocaleDateString("pt-BR") : "");
const fmtArea = (n: number | null) => (n === null ? "" : n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
const fmtMoeda = (n: number | null) => (n === null ? "" : n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));

export function prepararCamposSimil(f: FonteSimil): CampoPreparado[] {
  const campo = (
    campo: string,
    rotulo: string,
    valor: string | null | undefined,
    origem: string,
    opcoes: { obrigatorio?: boolean; chaveRevisao?: string } = { obrigatorio: true },
  ): CampoPreparado => {
    const v = (valor ?? "").trim();
    const emRevisao = opcoes.chaveRevisao ? f.camposEmRevisao.includes(opcoes.chaveRevisao) : false;
    let estado: EstadoCampo = "validado";
    let observacao: string | undefined;
    if (!v) {
      estado = opcoes.obrigatorio === false ? "validado" : "ausente";
      if (opcoes.obrigatorio === false) observacao = "opcional, em branco";
    } else if (emRevisao) {
      estado = "revisar";
      observacao = "há divergência aberta neste campo";
    }
    return { campo, rotulo, valor: v, origem, estado, observacao };
  };

  const enderecoCompleto = [f.endereco, f.numero, f.complemento].filter(Boolean).join(", ");

  return [
    campo("numero_os", "Número da OS", f.numeroOs, "demanda.numeroOs", { chaveRevisao: "numeroOs" }),
    campo("tipo_servico", "Tipo de serviço", f.tipoServico, "demanda.tipoServico"),
    campo("endereco", "Endereço do imóvel", enderecoCompleto, "demanda.endereco + numero + complemento", { chaveRevisao: "endereco" }),
    campo("bairro", "Bairro", f.bairro, "demanda.bairro", { obrigatorio: false }),
    campo("municipio", "Município", f.municipio, "demanda.municipio"),
    campo("uf", "UF", f.uf, "demanda.uf"),
    campo("cep", "CEP", f.cep, "demanda.cep", { obrigatorio: false }),
    campo("matricula", "Matrícula", f.matricula, "demanda.matricula", { chaveRevisao: "matricula" }),
    campo("cartorio", "Cartório de registro", f.cartorio, "demanda.cartorio", { obrigatorio: false }),
    campo("area_m2", "Área (m²)", fmtArea(f.areaM2), "demanda.areaM2", { chaveRevisao: "areaM2" }),
    campo("tipo_imovel", "Tipo do imóvel", f.tipoImovel, "demanda.tipoImovel"),
    campo("proprietario_nome", "Proprietário", f.proprietarioNome, "demanda.proprietarioNome", { chaveRevisao: "proprietarioNome" }),
    campo("proprietario_documento", "CPF/CNPJ do proprietário", mascararDocumento(f.proprietarioDoc), "demanda.proprietarioDoc", { chaveRevisao: "proprietarioDoc" }),
    campo("valor_avaliacao", "Valor de avaliação (R$)", fmtMoeda(f.valorAvaliacao), "demanda.valorAvaliacao", { obrigatorio: false }),
    campo("data_vistoria", "Data da vistoria", fmtData(f.dataVistoria), "demanda.dataVistoria", { obrigatorio: false }),
    campo("responsavel_tecnico", "Responsável técnico", f.responsavelNome, "demanda.responsavel", { obrigatorio: false }),
  ];
}

export function resumoDosCampos(campos: CampoPreparado[]) {
  return {
    total: campos.length,
    validados: campos.filter((c) => c.estado === "validado").length,
    revisar: campos.filter((c) => c.estado === "revisar").length,
    ausentes: campos.filter((c) => c.estado === "ausente").length,
  };
}

/**
 * Execução real no SIMIL. Ainda não existe driver: a decisão do produto é
 * nascer em modo sombra e só construir o driver depois de dezenas de
 * execuções validadas. Enquanto isso, chamar isto é um erro honesto, não uma
 * simulação de sucesso.
 */
export async function executarSimil(campos: CampoPreparado[]): Promise<{ protocolo: string }> {
  void campos;
  throw new ErroAutomacao("DRIVER_NOT_AVAILABLE", "O driver real do SIMIL ainda não foi liberado. Use o modo sombra.", { retentavel: false });
}

export async function healthcheckSimil(): Promise<{ ok: boolean; detalhe: string }> {
  return { ok: false, detalhe: "Driver real não instalado. Modo sombra disponível." };
}
