import { XMLParser, XMLValidator } from "fast-xml-parser";
import { credencialDTOSchema, filtroExecucaoOrcamentariaPacDTOSchema, retornoExecucaoPacDTOSchema, type AmbienteSiop, type CredencialDTO, type FiltroExecucaoOrcamentariaPacDTO, type RetornoExecucaoPacDTO } from "@/dominio/siop";

export const ENDPOINTS_SIOP = {
  HOMOLOGACAO: "https://testews.siop.gov.br/services/WSExecucaoOrcamentaria",
  PRODUCAO: "https://webservice.siop.gov.br/services/WSExecucaoOrcamentaria",
} as const;
export const NAMESPACE_SIOP = "http://servicoweb.siop.sof.planejamento.gov.br/";
export class ErroSiop extends Error {
  constructor(public readonly codigo: string, mensagem: string) { super(mensagem); this.name = "ErroSiop"; }
}
function escapar(valor: string | number) {
  const texto = String(valor);
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(texto)) throw new ErroSiop("CONFIGURACAO_INVALIDA", "Configuração SIOP contém caracteres inválidos");
  return texto.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
export function montarConsultaPac(credencial: CredencialDTO, filtro: FiltroExecucaoOrcamentariaPacDTO): string {
  const c = credencialDTOSchema.parse(credencial);
  const f = filtroExecucaoOrcamentariaPacDTOSchema.parse(filtro);
  if (c.perfil === undefined || f.anoExercicio === undefined) throw new ErroSiop("CONFIGURACAO_INVALIDA", "Perfil e exercício são obrigatórios para consultar o PAC");
  return `<?xml version="1.0" encoding="UTF-8"?><soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ser="${NAMESPACE_SIOP}"><soapenv:Header/><soapenv:Body><ser:consultarPac><credencial>${c.email !== undefined ? `<email>${escapar(c.email)}</email>` : ""}<perfil>${c.perfil}</perfil><senha>${escapar(c.senha)}</senha><usuario>${escapar(c.usuario)}</usuario></credencial><filtro><anoExercicio>${f.anoExercicio}</anoExercicio></filtro></ser:consultarPac></soapenv:Body></soapenv:Envelope>`;
}
function objeto(valor: unknown): Record<string, unknown> {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) throw new Error("estrutura");
  return valor as Record<string, unknown>;
}
export function interpretarRetornoPac(xml: string): RetornoExecucaoPacDTO {
  try {
    if (/<!DOCTYPE|<!ENTITY/i.test(xml) || XMLValidator.validate(xml) !== true) throw new Error("XML");
    const parsed = new XMLParser({
      ignoreAttributes: false, removeNSPrefix: true, parseTagValue: false,
      parseAttributeValue: false, trimValues: false,
      isArray: (nome) => nome === "execucaoOrcamentaria" || nome === "mensagensErro",
    }).parse(xml);
    const body = objeto(objeto(parsed.Envelope).Body);
    if (body.Fault) throw new ErroSiop("SOAP_FAULT", "O SIOP recusou a chamada SOAP");
    const retorno = objeto(objeto(body.consultarPacResponse).return);
    const normalizado: Record<string, unknown> = { ...retorno };
    if (!["true", "false", "1", "0"].includes(String(retorno.sucesso).trim())) throw new Error("sucesso");
    normalizado.sucesso = ["true", "1"].includes(String(retorno.sucesso).trim());
    if (retorno.mensagensErro !== undefined) {
      normalizado.mensagensErro = (retorno.mensagensErro as unknown[]).map((mensagem) => {
        if (typeof mensagem !== "object" || mensagem === null) return mensagem;
        const item = objeto(mensagem);
        if (["true", "1"].includes(String(item["@_nil"]))) return null;
        if (["false", "0"].includes(String(item["@_nil"]))) return item["#text"] ?? "";
        return mensagem;
      });
    }
    if (retorno.execucoesOrcamentarias !== undefined) {
      const colecao = retorno.execucoesOrcamentarias === "" ? {} : objeto(retorno.execucoesOrcamentarias);
      const lista = colecao.execucaoOrcamentaria ?? [];
      normalizado.execucoesOrcamentarias = { ...colecao, execucaoOrcamentaria: (lista as Record<string, unknown>[]).map((registro) => {
        const item = { ...registro };
        if (item.anoexercicio !== undefined) {
          if (!/^[+-]?\d+$/.test(String(item.anoexercicio).trim())) throw new Error("anoexercicio");
          item.anoexercicio = Number(item.anoexercicio);
        }
        return item;
      }) };
    }
    return retornoExecucaoPacDTOSchema.parse(normalizado);
  } catch (erro) {
    if (erro instanceof ErroSiop) throw erro;
    throw new ErroSiop("RETORNO_INVALIDO", "O SIOP devolveu um retorno incompatível com o contrato");
  }
}

/** Não segue o soap:address HTTP:8080 do WSDL; usa o acesso HTTPS publicado. */
export async function consultarPacRemoto(ambiente: AmbienteSiop, credencial: CredencialDTO, anoExercicio: number,
  requisitar: typeof fetch = fetch): Promise<RetornoExecucaoPacDTO> {
  const xml = montarConsultaPac(credencial, { anoExercicio });
  try {
    const resposta = await requisitar(ENDPOINTS_SIOP[ambiente], {
      method: "POST", headers: { "Content-Type": "text/xml; charset=utf-8", SOAPAction: '""' },
      body: xml, redirect: "error", cache: "no-store", signal: AbortSignal.timeout(60000),
    });
    // SOAP Fault pode vir com HTTP 500. O corpo só é interpretado, nunca logado.
    if (!resposta.body) throw new ErroSiop("HTTP_ERRO", "O SIOP não devolveu uma resposta");
    const leitor = resposta.body.getReader();
    const decoder = new TextDecoder();
    let recebido = 0;
    let corpo = "";
    try {
      while (true) {
        const { done, value } = await leitor.read();
        if (done) break;
        recebido += value.length;
        if (recebido > 64 * 1024 * 1024) throw new ErroSiop("RESPOSTA_EXCESSIVA", "Resposta SIOP excede 64 MiB; nenhuma linha foi importada");
        corpo += decoder.decode(value, { stream: true });
      }
      corpo += decoder.decode();
    } finally { await leitor.cancel(); }
    const retorno = interpretarRetornoPac(corpo);
    if (!resposta.ok) throw new ErroSiop("HTTP_ERRO", "O SIOP respondeu com erro HTTP");
    return retorno;
  } catch (erro) {
    if (erro instanceof ErroSiop) throw erro;
    throw new ErroSiop("CONEXAO_FALHOU", "Não foi possível consultar o SIOP; confira a conexão e tente novamente");
  }
}
