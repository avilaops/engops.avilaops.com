import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import { describe, expect, it } from "vitest";
import { CAMPOS_DECIMAIS, credencialDTOSchema, execucaoOrcamentariaPacDTOSchema, filtroExecucaoOrcamentariaPacDTOSchema, normalizarDecimal } from "@/dominio/siop";
import { montarConsultaPac, interpretarRetornoPac, consultarPacRemoto, ENDPOINTS_SIOP } from "@/integracoes/siop/soap";

const wsdl = readFileSync("docs/contratos/WSExecucaoOrcamentaria.wsdl", "utf8");
const dadosContrato = wsdl.match(/<xs:complexType name="execucaoOrcamentariaPacDTO">([\s\S]*?)<\/xs:complexType>/)![1];
const campos = Array.from(dadosContrato.matchAll(/name="([^"]+)" type="xs:([^"]+)"/g), (match) => ({ nome: match[1], tipo: match[2] }));
const credencial = { usuario: "integracao-teste", senha: "0123456789abcdef0123456789abcdef", perfil: 32, email: "teste@example.org" };
const envelope = (conteudo: string) => `<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"><s:Body>${conteudo}</s:Body></s:Envelope>`;

describe("contrato SIOP conferido contra o WSDL de homologação", () => {
  it("representa todos os 40 campos e todos os decimais do contrato, sem converter códigos em números", () => {
    expect(campos).toHaveLength(40);
    expect(Object.keys(execucaoOrcamentariaPacDTOSchema.shape).sort()).toEqual(campos.map((campo) => campo.nome).sort());
    const json = JSON.parse(readFileSync("docs/contratos/WSExecucaoOrcamentaria.schema.json", "utf8"));
    expect(Object.keys(json.$defs.execucaoOrcamentariaPacDTO.properties).sort()).toEqual(campos.map((campo) => campo.nome).sort());
    const padraoDecimal = new RegExp(json.$defs.execucaoOrcamentariaPacDTO.properties.pago.pattern);
    expect(padraoDecimal.test("99999999999999.99")).toBe(true);
    expect(padraoDecimal.test("100000000000000.00")).toBe(false);
    expect([...CAMPOS_DECIMAIS].sort()).toEqual(campos.filter((campo) => campo.tipo === "decimal").map((campo) => campo.nome).sort());
    expect(execucaoOrcamentariaPacDTOSchema.parse({ localizador: "0032", uo: "00128" })).toEqual({ localizador: "0032", uo: "00128" });
  });
  it("representa email do WSDL além dos campos de credencial do manual", () => {
    expect(Object.keys(credencialDTOSchema.shape).sort()).toEqual(["email", "perfil", "senha", "usuario"]);
    expect(credencialDTOSchema.parse(credencial)).toEqual(credencial);
    expect(filtroExecucaoOrcamentariaPacDTOSchema.parse({ anoExercicio: 2026 })).toEqual({ anoExercicio: 2026 });
  });
  it.each(["99999999999999.99", "0.01", "-123.45", "+0001.2300", ".5"])("preserva numeric(16,2) sem ponto flutuante: %s", (valor) => {
    expect(normalizarDecimal(valor)).toMatch(/^-?\d+\.\d{2}$/);
  });
  it.each(["100000000000000.00", "1.001", "1e3", "NaN", "", "1,23"])("recusa perda de precisão e valor inválido: %s", (valor) => {
    expect(() => normalizarDecimal(valor)).toThrow();
  });
  it("serializa consultarPac/anoExercicio do WSDL e escapa dados de entrada", () => {
    const xml = montarConsultaPac({ ...credencial, usuario: "nome<&\"'" }, { anoExercicio: 2026 });
    expect(xml).toContain("<ser:consultarPac>");
    expect(xml).toContain("<anoExercicio>2026</anoExercicio>");
    expect(xml).toContain("nome&lt;&amp;&quot;&apos;");
    expect(xml).not.toContain("consultarExecucaoPac");
    expect(xml).not.toContain("<exercicio>");
  });
  it("interpreta lista de retorno, booleano SOAP e decimais grandes sem arredondamento", () => {
    const xml = envelope(`<ns:consultarPacResponse xmlns:ns="http://servicoweb.siop.sof.planejamento.gov.br/"><return><sucesso>true</sucesso><execucoesOrcamentarias><execucaoOrcamentaria><anoexercicio>2026</anoexercicio><localizador>0032</localizador><pago>99999999999999.99</pago></execucaoOrcamentaria></execucoesOrcamentarias></return></ns:consultarPacResponse>`);
    const retorno = interpretarRetornoPac(xml);
    expect(retorno.sucesso).toBe(true);
    expect(retorno.execucoesOrcamentarias?.execucaoOrcamentaria).toEqual([{ anoexercicio: 2026, localizador: "0032", pago: "99999999999999.99" }]);
  });
  it("preserva lista de mensagens nulas e retorno vazio válidos no XSD", () => {
    const xml = envelope('<consultarPacResponse><return><mensagensErro xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:nil="true"/><mensagensErro>Sem autorização</mensagensErro><sucesso>0</sucesso></return></consultarPacResponse>');
    expect(interpretarRetornoPac(xml)).toEqual({ sucesso: false, mensagensErro: [null, "Sem autorização"] });
    expect(interpretarRetornoPac(envelope("<consultarPacResponse><return><sucesso>1</sucesso><execucoesOrcamentarias/></return></consultarPacResponse>"))).toEqual({ sucesso: true, execucoesOrcamentarias: { execucaoOrcamentaria: [] } });
    expect(interpretarRetornoPac(envelope('<consultarPacResponse><return><sucesso>false</sucesso><mensagensErro xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:nil="false">Mensagem</mensagensErro></return></consultarPacResponse>')).mensagensErro).toEqual(["Mensagem"]);
  });
  it.each([
    "<not-xml>",
    envelope("<consultarPacResponse><return/></consultarPacResponse>"),
    envelope("<Fault><faultstring>senha=nao-expor</faultstring></Fault>"),
    '<!DOCTYPE a [<!ENTITY x SYSTEM "file:///etc/passwd">]>' + envelope("<return>&x;</return>"),
    envelope("<consultarPacResponse><return><sucesso>true</sucesso><execucoesOrcamentarias><campoDesconhecido>1</campoDesconhecido></execucoesOrcamentarias></return></consultarPacResponse>"),
  ])("recusa retorno inválido ou fault sem ecoar conteúdo", (xml) => {
    expect(() => interpretarRetornoPac(xml)).toThrow();
    try { interpretarRetornoPac(xml); } catch (erro) { expect(String(erro)).not.toContain("nao-expor"); }
  });
});

it("envia e recebe SOAP por HTTP real, mantendo endpoint fixo e valores decimais exatos", async () => {
  let recebido = "";
  let soapAction: string | string[] | undefined;
  const servidor = createServer(async (req, res) => {
    for await (const chunk of req) recebido += chunk.toString();
    soapAction = req.headers.soapaction;
    res.setHeader("content-type", "text/xml");
    res.end(envelope("<consultarPacResponse><return><sucesso>true</sucesso></return></consultarPacResponse>"));
  });
  await new Promise<void>((resolve) => servidor.listen(0, "127.0.0.1", resolve));
  const endereco = servidor.address();
  if (!endereco || typeof endereco === "string") throw new Error("Servidor local indisponível");
  try {
    const requisitar: typeof fetch = async (url, opcoes) => {
      expect(url).toBe(ENDPOINTS_SIOP.HOMOLOGACAO);
      expect(opcoes?.redirect).toBe("error");
      return fetch(`http://127.0.0.1:${endereco.port}`, opcoes);
    };
    expect(await consultarPacRemoto("HOMOLOGACAO", credencial, 2026, requisitar)).toEqual({ sucesso: true });
    expect(recebido).toContain("<anoExercicio>2026</anoExercicio>");
    expect(soapAction).toBe('""');
  } finally { await new Promise<void>((resolve) => servidor.close(() => resolve())); }
});
