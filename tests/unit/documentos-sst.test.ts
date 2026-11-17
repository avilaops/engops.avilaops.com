import { describe, expect, it } from "vitest";
import { gerarCertificadoPdf, gerarListaParticipacaoPdf, gerarOrdemServicoPdf, normaPodeEmitirCertificado } from "@/servicos/documentos-sst";

describe("documentos SST", () => {
  it("gera certificado PDF válido", async () => {
    const bytes = await gerarCertificadoPdf({ funcionario: "Ana Souza", empresa: "ARM", treinamento: "EPI", norma: "NR-06", cargaHorariaMin: 480, realizadoEm: new Date("2026-11-16T12:00:00Z"), instrutor: "Guilherme" });
    expect(Buffer.from(bytes).subarray(0, 5).toString()).toBe("%PDF-");
  });

  it("gera lista de participação PDF válida", async () => {
    const bytes = await gerarListaParticipacaoPdf({ titulo: "NR-06 • EPI", empresa: "ARM", realizadoEm: new Date("2026-11-16T12:00:00Z"), participantes: [{ nome: "Ana Souza", presente: true, aprovado: true }] });
    expect(Buffer.from(bytes).subarray(0, 5).toString()).toBe("%PDF-");
  });

  it("gera ordem de serviço PDF válida", async () => {
    const bytes = await gerarOrdemServicoPdf({ numero: "OS-2026-0001", funcionario: "Ana Souza", empresa: "ARM", emitidaEm: new Date("2026-11-16T12:00:00Z"), atividades: "Operação", riscos: "Ruído", medidas: "Utilizar EPI", epis: "Protetor auricular" });
    expect(Buffer.from(bytes).subarray(0, 5).toString()).toBe("%PDF-");
  });

  it("impede emissão para normas revogadas", () => {
    expect(normaPodeEmitirCertificado("NR-02")).toBe(false);
    expect(normaPodeEmitirCertificado("NR 27")).toBe(false);
    expect(normaPodeEmitirCertificado("NR-35")).toBe(true);
  });
});
