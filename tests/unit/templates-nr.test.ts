import { describe, expect, it } from "vitest";
import { TEMPLATES_NR, obterTemplateNr } from "@/dominio/templates-nr";
import { gerarPdfDeHtml, renderizarCertificadoHtml } from "@/servicos/renderizador-documentos-sst";
import { PDFDocument } from "pdf-lib";

describe("templates HTML/CSS das 38 NRs", () => {
  it("possui um tema identificável para cada NR", () => {
    expect(TEMPLATES_NR).toHaveLength(38);
    expect(new Set(TEMPLATES_NR.map(item => item.codigo)).size).toBe(38);
    expect(new Set(TEMPLATES_NR.map(item => item.acento)).size).toBe(38);
    expect(new Set(TEMPLATES_NR.map(item => item.grafismo)).size).toBe(38);
    expect(new Set(TEMPLATES_NR.map(item => item.simbolo)).size).toBe(38);
    for (const template of TEMPLATES_NR) {
      expect(template.titulo).toBeTruthy();
      expect(template.familia).toMatch(/^(nr01|nr06|nr11|nr12|nr18|nr20)$/);
      expect(template.grafismo).toBe(`tema-${template.codigo.toLowerCase()}`);
      expect(template.acento).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it("resolve códigos de NR em formatos diferentes", () => {
    expect(obterTemplateNr("NR 1").codigo).toBe("NR-01");
    expect(obterTemplateNr("nr-035").codigo).toBe("NR-35");
  });

  it("renderiza frente e verso com identidade GRB e cliente sem injetar HTML", () => {
    const html = renderizarCertificadoHtml({
      norma: "NR-35",
      participante: "Ana <script>alert(1)</script>",
      cpf: "123.456.789-09",
      clienteNome: "ARM Soluções",
      clienteDocumento: "00.000.000/0001-00",
      treinamento: "Trabalho em altura",
      realizadoEm: new Date("2026-11-17T12:00:00Z"),
      cargaHorariaMin: 480,
      instrutor: "Guilherme Rosa Ávila Barros",
      responsavelRegistro: "CREA-SP 5070068250",
      logoGrbUrl: "/logo-grb.png",
      logoClienteUrl: "/logo-arm.png",
      conteudoProgramatico: ["Análise de risco", "Sistemas de proteção"],
    });
    expect(html).toContain("CERTIFICADO NR 35");
    expect(html).toContain("Conteúdo Programático");
    expect(html).toContain("ARM Soluções");
    expect(html).toContain("Ana &lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html.match(/class="pagina/g)).toHaveLength(2);
    expect(html).toContain("tema-nr-35");
    expect(html).toContain("data-simbolo=");
  });

  it("converte o template HTML/CSS em PDF de duas páginas", async () => {
    const bytes = await gerarPdfDeHtml("<!doctype html><style>@page{size:A4 landscape;margin:0}.pagina{width:297mm;height:210mm;page-break-after:always}.pagina:last-child{page-break-after:auto}</style><section class='pagina'>Frente</section><section class='pagina'>Verso</section>");
    expect(Buffer.from(bytes).subarray(0, 4).toString()).toBe("%PDF");
    expect((await PDFDocument.load(bytes)).getPageCount()).toBe(2);
  }, 30_000);

  it("compacta automaticamente nomes e conteúdos extensos", () => {
    const html = renderizarCertificadoHtml({ norma: "NR-01", participante: "Nome muito extenso ".repeat(8), cpf: "1", clienteNome: "Cliente", treinamento: "Treinamento", realizadoEm: new Date("2026-11-17T12:00:00Z"), cargaHorariaMin: 240, instrutor: "Instrutor", responsavelRegistro: "CREA", conteudoProgramatico: Array.from({ length: 18 }, (_, i) => `Tópico ${i + 1} com explicação detalhada`) });
    expect(html).toContain("pagina frente nome-longo");
    expect(html).toContain("pagina verso conteudo-denso");
    expect(html).toContain("overflow-wrap:anywhere");
  });
});
