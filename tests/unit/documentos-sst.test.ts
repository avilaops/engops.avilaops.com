import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { conteudoProgramaticoDaNorma, gerarCertificadoPdf, gerarListaParticipacaoPdf, gerarOrdemServicoPdf, normaPodeEmitirCertificado, nomeArquivoSeguro, quebrarTextoPdf } from "@/servicos/documentos-sst";
import { gerarPdfDeHtml, renderizarListaParticipacaoHtml } from "@/servicos/renderizador-documentos-sst";

describe("documentos SST", () => {
  it("gera certificado PDF válido", async () => {
    const bytes = await gerarCertificadoPdf({ funcionario: "Ana Souza", empresa: "ARM", treinamento: "EPI", norma: "NR-06", cargaHorariaMin: 480, realizadoEm: new Date("2026-11-16T12:00:00Z"), instrutor: "Guilherme" });
    expect(Buffer.from(bytes).subarray(0, 5).toString()).toBe("%PDF-");
  });

  it("gera lista de participação PDF válida", async () => {
    const bytes = await gerarListaParticipacaoPdf({ titulo: "NR-06 • EPI", empresa: "ARM", realizadoEm: new Date("2026-11-16T12:00:00Z"), participantes: [{ nome: "Ana Souza", presente: true, aprovado: true }] });
    expect(Buffer.from(bytes).subarray(0, 5).toString()).toBe("%PDF-");
  });

  it("renderiza lista de presença HTML com as marcas GRB e A.R.M. e espaço de assinatura", () => {
    const html = renderizarListaParticipacaoHtml({
      titulo: "NR-06 • Equipamento de Proteção Individual",
      empresa: "A.R.M. Exaustores <cliente>",
      realizadoEm: new Date("2026-11-16T12:00:00Z"),
      logoGrbUrl: "/grb-logo-completa.png",
      logoClienteUrl: "/cliente-arm.jpg",
      participantes: [{ nome: "Ana <script>alert(1)</script>", cpf: "123.456.789-09", presente: true, aprovado: true }],
    });
    expect(html).toContain("/grb-logo-completa.png");
    expect(html).toContain("/cliente-arm.jpg");
    expect(html).toContain("A.R.M. Exaustores &lt;cliente&gt;");
    expect(html).toContain("Ana &lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("Assinatura");
    expect(html).toContain("break-inside:avoid");
  });

  it("gera lista HTML em PDF A4 retrato", async () => {
    const html = renderizarListaParticipacaoHtml({ titulo: "NR-06", empresa: "A.R.M.", realizadoEm: new Date("2026-11-16T12:00:00Z"), participantes: [] });
    const bytes = await gerarPdfDeHtml(html, { landscape: false });
    const pagina = (await PDFDocument.load(bytes)).getPage(0);
    expect(pagina.getHeight()).toBeGreaterThan(pagina.getWidth());
  }, 30_000);

  it("gera ordem de serviço PDF válida", async () => {
    const bytes = await gerarOrdemServicoPdf({ numero: "OS-2026-0001", funcionario: "Ana Souza", empresa: "ARM", emitidaEm: new Date("2026-11-16T12:00:00Z"), atividades: "Operação", riscos: "Ruído", medidas: "Utilizar EPI", epis: "Protetor auricular" });
    expect(Buffer.from(bytes).subarray(0, 5).toString()).toBe("%PDF-");
  });

  it("impede emissão para normas revogadas", () => {
    expect(normaPodeEmitirCertificado("NR-02")).toBe(false);
    expect(normaPodeEmitirCertificado("NR 27")).toBe(false);
    expect(normaPodeEmitirCertificado("NR-35")).toBe(true);
    expect(normaPodeEmitirCertificado("NR-002")).toBe(false);
    expect(normaPodeEmitirCertificado("NR 027")).toBe(false);
  });

  it("pagina listas extensas", async () => {
    const bytes = await gerarListaParticipacaoPdf({ titulo: "NR-35", empresa: "ARM", realizadoEm: new Date("2026-11-16T12:00:00Z"), participantes: Array.from({ length: 40 }, (_, i) => ({ nome: `Participante ${i + 1}`, presente: true, aprovado: true })) });
    expect((await PDFDocument.load(bytes)).getPageCount()).toBeGreaterThan(1);
  });

  it("pagina ordens com conteúdo extenso e sanitiza nomes", async () => {
    const longo = "Risco ocupacional detalhado ".repeat(150);
    const bytes = await gerarOrdemServicoPdf({ numero: "OS-1", funcionario: "Ana", empresa: "ARM", emitidaEm: new Date("2026-11-16T12:00:00Z"), atividades: longo, riscos: longo, medidas: longo, epis: longo });
    expect((await PDFDocument.load(bytes)).getPageCount()).toBeGreaterThan(1);
    expect(nomeArquivoSeguro("OS\r\n2026/001")).toBe("OS-2026-001");
  });

  it("quebra palavras longas pela largura renderizada", () => {
    const linhas = quebrarTextoPdf("W".repeat(82), 100, texto => texto.length * 10);
    expect(linhas.length).toBeGreaterThan(1);
    expect(linhas.every(linha => linha.length * 10 <= 100)).toBe(true);
  });

  it("usa uma linha por tópico do conteúdo editado e ignora marcadores vazios", () => {
    expect(conteudoProgramaticoDaNorma("• Riscos específicos\n- Uso correto de EPI\n\n* Emergências", ["Padrão"])).toEqual(["Riscos específicos", "Uso correto de EPI", "Emergências"]);
    expect(conteudoProgramaticoDaNorma("  ", ["Padrão"])).toEqual(["Padrão"]);
  });
});
