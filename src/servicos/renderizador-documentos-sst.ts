import { obterTemplateNr } from "@/dominio/templates-nr";
import { existsSync } from "node:fs";
import { chromium } from "playwright-core";

export type DadosCertificadoHtml = {
  norma: string;
  participante: string;
  cpf?: string | null;
  clienteNome: string;
  clienteDocumento?: string | null;
  treinamento: string;
  realizadoEm: Date;
  cargaHorariaMin: number | null;
  instrutor: string | null;
  responsavelRegistro: string;
  logoGrbUrl?: string | null;
  logoClienteUrl?: string | null;
  conteudoProgramatico: readonly string[];
};

export type DadosListaParticipacaoHtml = {
  titulo: string;
  empresa: string;
  realizadoEm: Date;
  logoGrbUrl?: string | null;
  logoClienteUrl?: string | null;
  participantes: Array<{ nome: string; cpf?: string | null; presente: boolean; aprovado: boolean }>;
};

function escapar(valor: unknown) {
  return String(valor ?? "").replace(/[&<>"']/g, caractere => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[caractere]!);
}

function imagem(url: string | null | undefined, classe: string, alt: string) {
  return url ? `<img class="${classe}" src="${escapar(url)}" alt="${escapar(alt)}">` : "";
}

export function renderizarCertificadoHtml(dados: DadosCertificadoHtml): string {
  const tema = obterTemplateNr(dados.norma);
  const numero = tema.codigo.slice(3);
  const data = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo" }).format(dados.realizadoEm);
  const horas = dados.cargaHorariaMin ? `${dados.cargaHorariaMin / 60} horas` : "carga horária registrada";
  const conteudo = dados.conteudoProgramatico.map(item => `<li>${escapar(item)}</li>`).join("");
  const classeFrente = ["pagina", "frente", dados.participante.length > 55 ? "nome-longo" : "", tema.titulo.length > 52 ? "titulo-longo" : ""].filter(Boolean).join(" ");
  const classeVerso = ["pagina", "verso", dados.conteudoProgramatico.length > 10 || dados.conteudoProgramatico.join("").length > 900 ? "conteudo-denso" : ""].filter(Boolean).join(" ");
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>
@page{size:A4 landscape;margin:0}*{box-sizing:border-box;overflow-wrap:anywhere}html,body{margin:0;font-family:Arial,Helvetica,sans-serif;color:#303030}.pagina{position:relative;width:297mm;height:210mm;overflow:hidden;page-break-after:always;background:#fff}.pagina:last-child{page-break-after:auto}.moldura{position:absolute;inset:9mm;border:1.2mm solid var(--acento);clip-path:polygon(0 0,93% 0,100% 14%,100% 100%,7% 100%,0 86%)}.cabecalho{display:flex;align-items:center;justify-content:space-between;height:28mm;padding:8mm 18mm 0}.logo-grb{max-width:46mm;max-height:18mm}.logo-cliente{max-width:40mm;max-height:18mm}.nr{font-size:52pt;line-height:.9;font-weight:900;color:var(--acento);letter-spacing:-2px}.certificado{position:absolute;left:24mm;right:24mm;top:42mm;text-align:center}.certificado h1{font-size:31pt;margin:0 0 5mm;text-transform:uppercase}.titulo-longo .certificado h1{font-size:24pt}.nome{font-size:25pt;font-weight:800;margin:8mm 0 4mm}.nome-longo .nome{font-size:18pt;line-height:1.15;margin:5mm 0 3mm}.texto{max-width:235mm;margin:auto;font-size:12.5pt;line-height:1.5}.assinaturas{position:absolute;left:28mm;right:28mm;bottom:24mm;display:grid;grid-template-columns:1fr 1fr;gap:22mm}.assinatura{border-top:.7mm solid var(--acento);padding-top:3mm;text-align:center;font-size:10pt}.nome-longo .assinatura{font-size:8.5pt}.selo{position:absolute;right:14mm;bottom:12mm;width:24mm;height:24mm;display:grid;place-items:center;background:var(--acento-suave);border:1mm solid var(--acento);transform:rotate(45deg);font-weight:900}.selo span{transform:rotate(-45deg)}.motivo{position:absolute;right:-27mm;top:48mm;width:105mm;height:105mm;display:grid;place-items:center;opacity:.13;background:var(--acento);color:#fff;font-size:18pt;font-weight:900}.motivo.nr01{clip-path:polygon(50% 0,100% 100%,0 100%)}.motivo.nr06{border-radius:50%;box-shadow:inset 0 0 0 9mm var(--acento-suave)}.motivo.nr11{clip-path:polygon(35% 0,100% 0,65% 100%,0 100%)}.motivo.nr12{background:repeating-linear-gradient(45deg,var(--acento) 0 4mm,var(--acento-suave) 4mm 8mm);border-radius:18%}.motivo.nr18{clip-path:polygon(50% 0,100% 85%,85% 100%,15% 100%,0 85%)}.motivo.nr20{clip-path:polygon(52% 0,70% 31%,91% 53%,78% 89%,50% 100%,19% 83%,8% 49%,33% 35%)}.verso{background:linear-gradient(120deg,#171717 0 48%,#f7f7f7 48%)}.verso .conteudo{position:absolute;left:18mm;top:20mm;width:150mm;color:#fff}.verso h2{font-size:29pt;margin:0 0 10mm}.verso ul{padding-left:7mm;font-size:13pt;line-height:1.55}.conteudo-denso .conteudo{top:13mm}.conteudo-denso h2{font-size:22pt;margin-bottom:5mm}.conteudo-denso ul{columns:2;column-gap:8mm;font-size:9.5pt;line-height:1.25}.conteudo-denso li{break-inside:avoid;margin-bottom:2mm}.verso .painel{position:absolute;right:18mm;top:25mm;width:95mm;height:145mm;border:1.2mm solid var(--acento);padding:13mm;color:#222;background:var(--acento-suave);clip-path:polygon(10% 0,100% 0,90% 100%,0 100%)}.verso .painel strong{font-size:29pt;display:block;margin-top:30mm}.rodape{position:absolute;bottom:9mm;left:18mm;font-size:8.5pt;color:#666}
</style></head><body class="${tema.grafismo} familia-${tema.familia}" data-simbolo="${escapar(tema.simbolo)}" style="--acento:${tema.acento};--acento-suave:${tema.acentoSuave}">
<section class="${classeFrente}"><div class="moldura"></div><div class="motivo ${tema.familia}">${escapar(tema.simbolo)}</div><header class="cabecalho">${imagem(dados.logoGrbUrl,"logo-grb","GRB")}${imagem(dados.logoClienteUrl,"logo-cliente",dados.clienteNome)}</header><main class="certificado"><div class="nr">CERTIFICADO NR ${numero}</div><h1>${escapar(tema.titulo)}</h1><p>Certificamos que</p><div class="nome">${escapar(dados.participante)}</div><p class="texto">portador(a) do CPF ${escapar(dados.cpf || "não informado")}, concluiu o treinamento <strong>${escapar(dados.treinamento)}</strong>, promovido para ${escapar(dados.clienteNome)}${dados.clienteDocumento ? ` • CNPJ ${escapar(dados.clienteDocumento)}` : ""}, com ${escapar(horas)}, realizado em ${escapar(data)}.</p></main><div class="assinaturas"><div class="assinatura">${escapar(dados.participante)}<br>Participante</div><div class="assinatura">${escapar(dados.instrutor || "Responsável técnico")}<br>${escapar(dados.responsavelRegistro)}</div></div><div class="selo"><span>NR ${numero}</span></div></section>
<section class="${classeVerso}"><div class="conteudo"><h2>Conteúdo Programático</h2><ul>${conteudo}</ul></div><div class="painel"><small>${escapar(tema.codigo)}</small><strong>${escapar(tema.titulo)}</strong></div><div class="rodape">Documento emitido pela GRB • ${escapar(dados.clienteNome)}</div></section>
</body></html>`;
}

export function renderizarListaParticipacaoHtml(dados: DadosListaParticipacaoHtml): string {
  const data = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo" }).format(dados.realizadoEm);
  const linhas = dados.participantes.map((participante, indice) => `<tr><td>${indice + 1}</td><td><strong>${escapar(participante.nome)}</strong><small>${escapar(participante.cpf || "CPF não informado")}</small></td><td>${participante.presente ? (participante.aprovado ? "Aprovado" : "Presente") : "Ausente"}</td><td class="assinatura-lista">Assinatura</td></tr>`).join("");
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>
@page{size:A4 portrait;margin:12mm}*{box-sizing:border-box}html,body{margin:0;font-family:Arial,Helvetica,sans-serif;color:#183329}header{display:grid;grid-template-columns:50mm 1fr 45mm;align-items:center;gap:8mm;border-bottom:1.2mm solid #0f5138;padding-bottom:6mm;min-height:27mm}.logo{max-width:100%;max-height:22mm;object-fit:contain}.marca-cliente{text-align:right}.titulo{text-align:center}.titulo h1{margin:0;color:#0f5138;font-size:20pt}.titulo p{margin:2mm 0 0;color:#9b761d;font-weight:700}.dados{display:flex;justify-content:space-between;gap:8mm;margin:8mm 0 5mm;padding:4mm;background:#eef5f1;border-left:1.5mm solid #0f5138}.dados strong{display:block;font-size:9pt;color:#64716b}.dados span{font-size:11pt}table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:9.5pt}thead{display:table-header-group}tr{break-inside:avoid;page-break-inside:avoid}th{background:#0f5138;color:#fff;padding:3mm;text-align:left}td{border-bottom:.3mm solid #cbd7d1;padding:3mm;vertical-align:middle;height:15mm}th:nth-child(1),td:nth-child(1){width:9mm;text-align:center}th:nth-child(3),td:nth-child(3){width:24mm}th:nth-child(4),td:nth-child(4){width:43mm}.assinatura-lista{color:#77837e;border-bottom:.3mm solid #77837e}small{display:block;margin-top:1mm;color:#64716b}footer{margin-top:8mm;padding-top:4mm;border-top:.3mm solid #cbd7d1;font-size:8pt;color:#64716b;display:flex;justify-content:space-between}.reserva-logo{display:block;width:100%;height:20mm}
</style></head><body><header><div>${imagem(dados.logoGrbUrl,"logo","GRB") || '<span class="reserva-logo"></span>'}</div><div class="titulo"><h1>Lista de Presença</h1><p>${escapar(dados.titulo)}</p></div><div class="marca-cliente">${imagem(dados.logoClienteUrl,"logo","Logo do cliente") || '<span class="reserva-logo"></span>'}</div></header><section class="dados"><div><strong>Empresa cliente</strong><span>${escapar(dados.empresa)}</span></div><div><strong>Data</strong><span>${escapar(data)}</span></div></section><table><thead><tr><th>№</th><th>Participante • CPF</th><th>Situação</th><th>Assinatura</th></tr></thead><tbody>${linhas || '<tr><td></td><td>Nenhum participante cadastrado</td><td></td><td class="assinatura-lista">Assinatura</td></tr>'}</tbody></table><footer><span>GRB Engenharia e Segurança do Trabalho</span><span>${escapar(dados.empresa)}</span></footer></body></html>`;
}

function executavelChromium() {
  const candidatos = [
    process.env.CHROMIUM_PATH,
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe",
  ].filter((valor): valor is string => Boolean(valor));
  const caminho = candidatos.find(existsSync);
  if (!caminho) throw new Error("Chromium não encontrado para geração de PDF.");
  return caminho;
}

export async function gerarPdfDeHtml(html: string, opcoes: { landscape?: boolean } = {}): Promise<Uint8Array> {
  const navegador = await chromium.launch({ executablePath: executavelChromium(), headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  try {
    const pagina = await navegador.newPage();
    await pagina.setContent(html, { waitUntil: "networkidle" });
    await pagina.addStyleTag({ content: "html,body{margin:0!important;padding:0!important}" });
    await pagina.emulateMedia({ media: "print" });
    return await pagina.pdf({ format: "A4", landscape: opcoes.landscape ?? true, printBackground: true, preferCSSPageSize: true, margin: { top: "0", right: "0", bottom: "0", left: "0" } });
  } finally {
    await navegador.close();
  }
}
