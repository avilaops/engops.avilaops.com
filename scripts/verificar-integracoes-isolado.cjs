// Fluxos de escrita somente em banco isolado e servidor local, com dados sintéticos.
const assert = require("node:assert/strict");
const { spawn, spawnSync } = require("node:child_process");
const { createServer } = require("node:net");
const { randomUUID } = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");
const { chromium } = require(process.env.GOV_PLAYWRIGHT_MODULE || "playwright");

async function verificar() {
  const conexao = process.env.INTEGRACOES_TEST_DATABASE_URL;
  if (!conexao || !/^engops_gov_test_[a-f0-9]{10}$/.test(new URL(conexao).pathname.slice(1))) throw new Error("Banco isolado obrigatório.");
  const db = new PrismaClient({ datasourceUrl: conexao });
  const raiz = path.resolve(__dirname, "..");
  const pasta = path.join(raiz, "reports/integracoes");
  await fs.mkdir(pasta, { recursive: true });
  let servidor, browser;
  try {
    const empresa = await db.empresa.findUniqueOrThrow({ where: { slug: "integracoes-teste-a" } });
    const outra = await db.empresa.findUniqueOrThrow({ where: { slug: "integracoes-teste-b" } });
    await db.membro.upsert({ where: { empresaId_email: { empresaId: empresa.id, email: "leitor@example.test" } }, create: { empresaId: empresa.id, email: "leitor@example.test", nome: "Leitor sintético", papel: "CONSULTA" }, update: { papel: "CONSULTA" } });
    await db.membro.upsert({ where: { empresaId_email: { empresaId: empresa.id, email: "admin-empresa@example.test" } }, create: { empresaId: empresa.id, email: "admin-empresa@example.test", nome: "Administrador sintético", papel: "ADMIN" }, update: { papel: "ADMIN" } });
    const demanda = await db.demanda.create({ data: { empresaId: empresa.id, codigo: "ENG-9901", status: "RAE_PENDENTE", criadoPor: "admin@example.test" } });
    await db.itemChecklist.create({ data: { demandaId: demanda.id, grupo: "RAE", chave: "rae.gerar", rotulo: "RAE gerado", estado: "PENDENTE", ordem: 1 } });
    await db.documento.create({ data: { empresaId: empresa.id, demandaId: demanda.id, categoria: "RAE", tipo: "RAE", nomeOriginal: "rae-sintetico.pdf", nomeArquivo: "rae-sintetico.pdf", chave: "local:fixture-browser", mime: "application/pdf", tamanho: 1, hash: "fixture-browser", enviadoPor: "admin@example.test" } });
    const credencial = await db.siopCredencial.findFirstOrThrow({ where: { empresaId: empresa.id } });
    const consulta = await db.siopConsulta.create({ data: { empresaId: empresa.id, credencialId: credencial.id, ambiente: "HOMOLOGACAO", anoExercicio: 2026, solicitadoPor: "admin@example.test", status: "CONCLUIDA" } });
    const retorno = await db.siopRetorno.create({ data: { empresaId: empresa.id, consultaId: consulta.id, sucesso: true, execucoesPresentes: true } });
    await db.siopExecucaoOrcamentariaPac.create({ data: { empresaId: empresa.id, retornoId: retorno.id, ordem: 0, tituloacao: "Execução sintética de teste", localizador: "0032", pago: "99999999999999.99" } });
    const portaLivre = createServer(); await new Promise(r => portaLivre.listen(0, "127.0.0.1", r));
    const porta = portaLivre.address().port; await new Promise(r => portaLivre.close(r));
    const base = `http://127.0.0.1:${porta}`, segredo = randomUUID();
    servidor = spawn(process.execPath, [path.join(raiz, "node_modules/next/dist/bin/next"), "dev", "--hostname", "127.0.0.1", "--port", String(porta)], {
      cwd: raiz, stdio: "ignore", windowsHide: true,
      env: { ...process.env, DATABASE_URL: conexao, SSO_JWT_SECRET: segredo, ENGOPS_DONOS: "admin@example.test", ENGOPS_DEV_EMAIL: "", ENGOPS_SITE_URL: base, ENGOPS_WORKER: "0", NEXT_TELEMETRY_DISABLED: "1" },
    });
    console.log("Navegador isolado • aguardando servidor local");
    let pronto = false;
    for (let tentativa = 0; tentativa < 90; tentativa++) {
      if (servidor.exitCode !== null) throw new Error("Servidor local encerrou antes da verificação.");
      try { const r = await fetch(base + "/api/health", { signal: AbortSignal.timeout(3000) }); if (r.ok) { pronto = true; break; } } catch {}
      await new Promise(r => setTimeout(r, 1000));
    }
    if (!pronto) throw new Error("Servidor local não iniciou.");
    browser = await chromium.launch({ headless: true, ...(process.env.GOV_BROWSER_EXECUTABLE ? { executablePath: process.env.GOV_BROWSER_EXECUTABLE } : {}) });
    const contexto = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const autenticar = async (email, empresaId) => {
      const token = jwt.sign({ sub: email, email, nome: "Teste isolado", papel: "ADMIN", foto: null }, segredo, { issuer: "auth.avilaops.com", expiresIn: 600 });
      await contexto.addCookies([{ name: "avila_sso", value: token, url: base, httpOnly: true, sameSite: "Lax" }, { name: "engops_empresa", value: empresaId, url: base, httpOnly: true, sameSite: "Lax" }]);
    };
    await autenticar("admin@example.test", empresa.id);
    const page = await contexto.newPage(); page.setDefaultTimeout(60000); page.setDefaultNavigationTimeout(120000);
    const erros = []; page.on("pageerror", erro => erros.push(erro.message));
    console.log("Navegador isolado • configuração e detalhe SIOP");
    await page.goto(base + "/automacoes/siop");
    await page.getByLabel("Usuário do webservice").fill("usuario-browser");
    await page.getByLabel("Perfil", { exact: true }).fill("32");
    await page.getByLabel("Referência da credencial protegida").fill("SIOP_BROWSER_MD5");
    await page.getByLabel("Habilitar consultas neste ambiente").uncheck();
    await page.getByRole("button", { name: "Salvar configuração SIOP" }).click();
    await page.getByText("Configuração SIOP salva.", { exact: true }).waitFor();
    await page.reload(); assert.equal(await page.getByLabel("Usuário do webservice").inputValue(), "usuario-browser");
    assert.equal(await page.getByRole("button", { name: "Consultar execução orçamentária" }).isDisabled(), true);
    await page.goto(base + `/automacoes/siop/${consulta.id}`);
    assert.equal(await page.locator(".siop-campo").count(), 40);
    await page.getByText("R$ 99.999.999.999.999,99", { exact: true }).waitFor();
    await page.getByText("0032", { exact: true }).waitFor();
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: path.join(pasta, "isolado-siop-mobile.png"), fullPage: true });
    console.log("Navegador isolado • registro manual e checklist imediato");
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(base + "/automacoes/operacao/rae?busca=ENG-9901");
    await page.getByLabel("Comprovante do dossiê").selectOption({ label: "rae-sintetico.pdf" });
    await page.getByRole("button", { name: "Registrar operação manual" }).click();
    await page.getByText("Operação manual registrada com comprovante.", { exact: true }).waitFor();
    await page.goto(base + `/demandas/${demanda.id}`);
    assert.equal(await page.getByText("RAE gerado", { exact: true }).locator("..").getByLabel("OK", { exact: true }).count(), 1);
    assert.equal((await db.demanda.findUniqueOrThrow({ where: { id: demanda.id } })).status, "RAE_PENDENTE");
    await page.screenshot({ path: path.join(pasta, "isolado-checklist-desktop.png"), fullPage: true });
    console.log("Navegador isolado • perfil de consulta e isolamento entre empresas");
    await autenticar("admin-empresa@example.test", empresa.id);
    await page.goto(base + "/automacoes/siop");
    assert.equal(await page.getByLabel("Referência da credencial protegida").isEditable(), false);
    const trocaIndevida = await contexto.request.post(base + "/api/integracoes/siop/configuracao", { headers: { origin: base }, data: { ambiente: "HOMOLOGACAO", usuario: "outro-usuario", perfil: 32, senhaEnvRef: "SIOP_OUTRA_EMPRESA_MD5", habilitada: false } });
    assert.equal(trocaIndevida.status(), 403);
    await autenticar("leitor@example.test", empresa.id);
    await page.goto(base + "/automacoes/siop");
    assert.equal(await page.getByRole("button", { name: "Salvar configuração SIOP" }).count(), 0);
    assert.equal(await page.getByRole("button", { name: "Consultar execução orçamentária" }).count(), 0);
    const negada = await contexto.request.post(base + "/api/integracoes/siop/configuracao", { headers: { origin: base }, data: {} });
    assert.equal(negada.status(), 403);
    await autenticar("admin@example.test", outra.id);
    await page.goto(base + "/automacoes/siop");
    assert.equal(await page.getByLabel("Usuário do webservice").inputValue(), "");
    assert.equal((await contexto.request.get(base + `/api/integracoes/siop/consultas/${consulta.id}`)).status(), 404);
    assert.deepEqual(erros, []);
    const resultado = { bancoIsolado: true, configuracaoPersistida: true, camposSiop: 40, centavosExatos: true, registroManual: true, checklistImediato: true, referenciaProtegidaVinculadaPeloDono: true, permissaoConsulta: true, isolamento: true, verificadoEm: new Date().toISOString() };
    await fs.writeFile(path.join(pasta, "isolado-resultado.json"), JSON.stringify(resultado, null, 2));
    console.log(JSON.stringify(resultado));
  } finally {
    await browser?.close();
    if (servidor?.pid) {
      if (process.platform === "win32") spawnSync("taskkill.exe", ["/PID", String(servidor.pid), "/T", "/F"], { stdio: "ignore", windowsHide: true });
      else servidor.kill();
    }
    await db.$disconnect();
  }
}
verificar().catch(erro => { console.error(String(erro.message).replace(/postgres(?:ql)?:\/\/[^\s]+/g, "[conexão protegida]")); process.exitCode = 1; });
