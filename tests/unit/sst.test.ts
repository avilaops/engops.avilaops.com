import { describe, expect, it } from "vitest";
import { atualizacaoConteudoNormaSchema, atualizacaoTreinamentoSchema, calcularVencimento, invalidacaoCertificadoSchema, normaSchema, ordemServicoSchema, participantePertenceAoTenant, presencaEmMassaSchema, treinamentoSchema, transicaoOrdemServicoPermitida, transicaoTreinamentoPermitida } from "@/dominio/sst";

describe("SST", () => {
  it("calcula a validade do certificado em meses", () => {
    expect(calcularVencimento(new Date("2026-01-31T12:00:00Z"), 1).toISOString()).toBe("2026-02-28T12:00:00.000Z");
  });

  it("recusa participante de outro tenant", () => {
    expect(participantePertenceAoTenant("empresa-a", "empresa-b")).toBe(false);
  });

  it("aceita validade vazia como não informada", () => {
    const dados = treinamentoSchema.parse({ clienteId: "cliente-1", titulo: "NR 10", inicio: "2026-11-16T10:00", validadeMeses: "", cargaHorariaMin: "480" });
    expect(dados.validadeMeses).toBeUndefined(); expect(dados.cargaHorariaMin).toBe(480); expect(dados.inicio.toISOString()).toBe("2026-11-16T13:00:00.000Z");
  });

  it("exige empresa cliente em treinamento e ordem de serviço", () => {
    expect(() => treinamentoSchema.parse({ titulo: "NR-35", inicio: "2026-11-17T08:00" })).toThrow();
    expect(() => ordemServicoSchema.parse({ funcionarioId: "f1", numero: "OS-1", emitidaEm: "2026-11-17", atividades: "Atividade", riscos: "Risco", medidas: "Medida" })).toThrow();
  });

  it("normaliza o código da NR", () => {
    expect(normaSchema.parse({ codigo: "nr-002", titulo: "Revogada" }).codigo).toBe("NR-02");
    expect(() => normaSchema.parse({ codigo: "NR-99", titulo: "Inválida" })).toThrow();
  });

  it("valida a edição do conteúdo programático da norma", () => {
    expect(atualizacaoConteudoNormaSchema.parse({ normaId: "n1", textoReferencia: "Riscos\nMedidas preventivas" })).toEqual({ normaId: "n1", textoReferencia: "Riscos\nMedidas preventivas" });
    expect(() => atualizacaoConteudoNormaSchema.parse({ normaId: "n1", textoReferencia: "" })).toThrow();
  });

  it("valida ordem de serviço completa", () => {
    expect(ordemServicoSchema.parse({ clienteId: "cliente-1", funcionarioId: "func-1", numero: "OS-2026-001", emitidaEm: "2026-11-17", atividades: "Operar máquina", riscos: "Ruído", medidas: "Proteção coletiva", epis: "Protetor auricular" }).numero).toBe("OS-2026-001");
    expect(() => ordemServicoSchema.parse({ funcionarioId: "func-1", numero: "OS", emitidaEm: "2026-11-17", atividades: "", riscos: "", medidas: "" })).toThrow();
  });

  it("controla transições de treinamento", () => {
    expect(transicaoTreinamentoPermitida("PLANEJADO", "REALIZADO")).toBe(true);
    expect(transicaoTreinamentoPermitida("PLANEJADO", "CANCELADO")).toBe(true);
    expect(transicaoTreinamentoPermitida("REALIZADO", "PLANEJADO")).toBe(false);
    expect(transicaoTreinamentoPermitida("CANCELADO", "REALIZADO")).toBe(false);
  });

  it("valida edição de treinamento e presença em massa", () => {
    const treino = atualizacaoTreinamentoSchema.parse({ treinamentoId: "t1", clienteId: "c1", titulo: "NR 35", inicio: "2026-11-17T08:00", cargaHorariaMin: "480" });
    expect(treino.inicio.toISOString()).toBe("2026-11-17T11:00:00.000Z");
    expect(presencaEmMassaSchema.parse({ treinamentoId: "t1", resultado: "PRESENTE_APROVADO" })).toMatchObject({ resultado: "PRESENTE_APROVADO" });
  });

  it("exige justificativa para invalidar certificado", () => {
    expect(invalidacaoCertificadoSchema.parse({ participanteId: "p1", motivo: "Dados cadastrais incorretos" })).toMatchObject({ participanteId: "p1" });
    expect(() => invalidacaoCertificadoSchema.parse({ participanteId: "p1", motivo: "erro" })).toThrow();
  });

  it("controla o ciclo da ordem de serviço", () => {
    expect(transicaoOrdemServicoPermitida("RASCUNHO", "EMITIDA")).toBe(true);
    expect(transicaoOrdemServicoPermitida("EMITIDA", "ASSINADA")).toBe(true);
    expect(transicaoOrdemServicoPermitida("ASSINADA", "RASCUNHO")).toBe(false);
    expect(transicaoOrdemServicoPermitida("CANCELADA", "EMITIDA")).toBe(false);
  });
});
