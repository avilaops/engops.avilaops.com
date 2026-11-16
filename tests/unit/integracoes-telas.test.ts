import { describe, expect, it } from "vitest";
import { formatarValorSiop, paginaIntegracao } from "@/dominio/integracoes-telas";
import { configuracaoOperacionalSchema, registroManualSchema } from "@/dominio/operacoes-externas";

describe("valores e navegação das integrações", () => {
  it("exibe centavos grandes sem conversão para ponto flutuante", () => {
    expect(formatarValorSiop("99999999999999.99")).toBe("R$ 99.999.999.999.999,99");
    expect(formatarValorSiop("-0.01")).toBe("-R$ 0,01");
    expect(formatarValorSiop("0.00")).toBe("R$ 0,00");
    expect(formatarValorSiop(undefined)).toBe("Não informado");
  });
  it("limita paginação e recusa entradas que gerariam offsets negativos ou enormes", () => {
    expect(paginaIntegracao("2")).toBe(2);
    for (const valor of [undefined, "0", "-1", "1.5", "Infinity", "999999999", ["2", "3"]]) {
      expect(paginaIntegracao(valor)).toBe(1);
    }
  });
});

describe("configuração e comprovantes de operações externas", () => {
  const config = { sistema: "BANCO_BRASIL", portalUrl: "https://www.bb.com.br/", unidade: "", operacao: "Consulta de proposta", observacoes: "" };
  it("aceita configuração incompleta para preparar o acesso sem inventar uma conexão", () => {
    expect(configuracaoOperacionalSchema.parse({ ...config, portalUrl: "", operacao: "" }).portalUrl).toBeNull();
  });
  it.each(["http://www.bb.com.br", "javascript:alert(1)", "https://usuario:senha@example.com/", "https://example.com/?token=segredo", "https://example.com/#token"])("recusa URL imprópria ou com credenciais: %s", (portalUrl) => {
    expect(configuracaoOperacionalSchema.safeParse({ ...config, portalUrl }).success).toBe(false);
  });
  it("exige protocolo para portais e comprovante para qualquer registro", () => {
    const dados = { sistema: "SIOPI", demandaId: "demanda", documentoId: "documento", protocolo: "", observacoes: "" };
    expect(registroManualSchema.safeParse(dados).success).toBe(false);
    expect(registroManualSchema.safeParse({ ...dados, sistema: "RAE" }).success).toBe(true);
    expect(registroManualSchema.safeParse({ ...dados, protocolo: "123", documentoId: "" }).success).toBe(false);
  });
});
