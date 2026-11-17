import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

const VERDE = rgb(0.063, 0.31, 0.22);
const DOURADO = rgb(0.78, 0.60, 0.24);
const TEXTO = rgb(0.09, 0.15, 0.12);
const CINZA = rgb(0.42, 0.47, 0.44);

function dataBr(valor: Date) { return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(valor); }
function cabecalho(pagina: PDFPage, fonte: PDFFont, titulo: string, subtitulo: string) {
  const { width, height } = pagina.getSize();
  pagina.drawRectangle({ x: 0, y: height - 92, width, height: 92, color: VERDE });
  pagina.drawRectangle({ x: 38, y: height - 77, width: 55, height: 55, borderColor: DOURADO, borderWidth: 2 });
  pagina.drawText("GRB", { x: 48, y: height - 58, size: 17, font: fonte, color: rgb(1, 1, 1) });
  pagina.drawText(titulo, { x: 120, y: height - 47, size: 20, font: fonte, color: rgb(1, 1, 1) });
  pagina.drawText(subtitulo, { x: 120, y: height - 69, size: 10, font: fonte, color: DOURADO });
}
function quebrar(texto: string, maximo = 82) {
  const linhas: string[] = []; let atual = "";
  for (const palavra of texto.replace(/\s+/g, " ").trim().split(" ")) {
    if (`${atual} ${palavra}`.trim().length > maximo && atual) { linhas.push(atual); atual = palavra; }
    else atual = `${atual} ${palavra}`.trim();
  }
  if (atual) linhas.push(atual); return linhas;
}
function paragrafo(pagina: PDFPage, fonte: PDFFont, texto: string, x: number, y: number, tamanho = 11) {
  for (const linha of quebrar(texto)) { pagina.drawText(linha, { x, y, size: tamanho, font: fonte, color: TEXTO }); y -= tamanho + 5; }
  return y;
}

export function normaPodeEmitirCertificado(codigo: string) {
  const numero = codigo.toUpperCase().replace(/\D/g, "").padStart(2, "0");
  return numero !== "02" && numero !== "27";
}

export async function gerarCertificadoPdf(dados: { funcionario: string; empresa: string; treinamento: string; norma: string; cargaHorariaMin: number | null; realizadoEm: Date; instrutor: string | null }) {
  const pdf = await PDFDocument.create(); const pagina = pdf.addPage([842, 595]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica); const negrito = await pdf.embedFont(StandardFonts.HelveticaBold);
  cabecalho(pagina, negrito, "CERTIFICADO", `${dados.norma} • SEGURANÇA E SAÚDE NO TRABALHO`);
  pagina.drawText("Certificamos que", { x: 65, y: 410, size: 14, font: regular, color: CINZA });
  pagina.drawText(dados.funcionario, { x: 65, y: 365, size: 28, font: negrito, color: VERDE });
  pagina.drawLine({ start: { x: 65, y: 350 }, end: { x: 777, y: 350 }, thickness: 1, color: DOURADO });
  const horas = dados.cargaHorariaMin ? `${dados.cargaHorariaMin / 60} horas` : "carga horária registrada";
  paragrafo(pagina, regular, `concluiu o treinamento ${dados.treinamento}, promovido para ${dados.empresa}, com ${horas}, realizado em ${dataBr(dados.realizadoEm)}.`, 65, 315, 13);
  pagina.drawText("Instrutor responsável", { x: 65, y: 120, size: 10, font: regular, color: CINZA });
  pagina.drawText(dados.instrutor || "Não informado", { x: 65, y: 98, size: 13, font: negrito, color: TEXTO });
  pagina.drawText("Documento gerado pelo EngOps • GRB", { x: 610, y: 45, size: 8, font: regular, color: CINZA });
  return pdf.save();
}

export async function gerarListaParticipacaoPdf(dados: { titulo: string; empresa: string; realizadoEm: Date; participantes: Array<{ nome: string; presente: boolean; aprovado: boolean }> }) {
  const pdf = await PDFDocument.create(); const pagina = pdf.addPage([595, 842]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica); const negrito = await pdf.embedFont(StandardFonts.HelveticaBold);
  cabecalho(pagina, negrito, "LISTA DE PARTICIPAÇÃO", dados.titulo);
  pagina.drawText(`Empresa • ${dados.empresa}`, { x: 45, y: 715, size: 11, font: negrito, color: TEXTO });
  pagina.drawText(`Data • ${dataBr(dados.realizadoEm)}`, { x: 390, y: 715, size: 11, font: regular, color: TEXTO });
  let y = 670; pagina.drawRectangle({ x: 45, y, width: 505, height: 28, color: VERDE });
  pagina.drawText("Participante", { x: 55, y: y + 9, size: 10, font: negrito, color: rgb(1, 1, 1) });
  pagina.drawText("Resultado", { x: 390, y: y + 9, size: 10, font: negrito, color: rgb(1, 1, 1) });
  for (const [indice, participante] of dados.participantes.entries()) { y -= 31; pagina.drawText(`${indice + 1}. ${participante.nome}`, { x: 55, y: y + 9, size: 10, font: regular, color: TEXTO }); pagina.drawText(participante.presente ? (participante.aprovado ? "APROVADO" : "PRESENTE") : "AUSENTE", { x: 390, y: y + 9, size: 9, font: negrito, color: VERDE }); pagina.drawLine({ start: { x: 45, y }, end: { x: 550, y }, thickness: 0.5, color: rgb(0.86, 0.89, 0.87) }); }
  return pdf.save();
}

export async function gerarOrdemServicoPdf(dados: { numero: string; funcionario: string; empresa: string; emitidaEm: Date; atividades: string; riscos: string; medidas: string; epis: string | null }) {
  const pdf = await PDFDocument.create(); const pagina = pdf.addPage([595, 842]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica); const negrito = await pdf.embedFont(StandardFonts.HelveticaBold);
  cabecalho(pagina, negrito, "ORDEM DE SERVIÇO SST", dados.numero);
  pagina.drawText(dados.funcionario, { x: 45, y: 710, size: 20, font: negrito, color: VERDE });
  pagina.drawText(`${dados.empresa} • Emitida em ${dataBr(dados.emitidaEm)}`, { x: 45, y: 687, size: 10, font: regular, color: CINZA });
  let y = 635;
  for (const [titulo, texto] of [["ATIVIDADES", dados.atividades], ["RISCOS OCUPACIONAIS", dados.riscos], ["MEDIDAS PREVENTIVAS", dados.medidas], ["EPIs", dados.epis || "Não informado"]]) { pagina.drawText(titulo, { x: 45, y, size: 11, font: negrito, color: VERDE }); y = paragrafo(pagina, regular, texto, 45, y - 22, 10) - 24; }
  pagina.drawLine({ start: { x: 65, y: 100 }, end: { x: 270, y: 100 }, thickness: 0.7, color: CINZA }); pagina.drawText("Assinatura do funcionário", { x: 105, y: 83, size: 9, font: regular, color: CINZA });
  pagina.drawLine({ start: { x: 325, y: 100 }, end: { x: 530, y: 100 }, thickness: 0.7, color: CINZA }); pagina.drawText("Responsável pela emissão", { x: 365, y: 83, size: 9, font: regular, color: CINZA });
  return pdf.save();
}
