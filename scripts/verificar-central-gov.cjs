// Verificação de produção autorizada • usa sessão curta do proprietário, em memória.
// --salvar guarda uma oportunidade REAL no tenant Ávila Ops e valida isolamento.
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs/promises");
const path = require("node:path");
const { chromium } = require(process.env.GOV_PLAYWRIGHT_MODULE || "playwright");
const remoto = `const {PrismaClient}=require('@prisma/client'); const {createHmac}=require('node:crypto'); const db=new PrismaClient();
(async()=>{ const empresa=await db.empresa.findFirstOrThrow({where:{cnpj:'67.954.417/0001-64'},select:{id:true,nome:true,cnpj:true}});
const outra=await db.empresa.findFirst({where:{id:{not:empresa.id},ativo:true},select:{id:true}});
const codificar=v=>Buffer.from(JSON.stringify(v)).toString('base64url');
const corpo=codificar({alg:'HS256',typ:'JWT'})+'.'+codificar({sub:'verificacao-proprietario',email:'nicolas@avilaops.com',nome:'Nicolas',papel:'ADMIN',foto:null,iss:'auth.avilaops.com',iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+600});
const token=corpo+'.'+createHmac('sha256',process.env.SSO_JWT_SECRET).update(corpo).digest('base64url');
console.log(JSON.stringify({empresa,outra,token})); await db.$disconnect(); })().catch(()=>{process.exitCode=1});`;
async function verificar() {
  const resultado = JSON.parse(execFileSync("ssh", ["-o", "BatchMode=yes", "applications", "docker exec -i -w /app engops-avilaops-com-web node"], { input: remoto, encoding: "utf8", timeout: 45000, windowsHide: true }));
  assert.equal(resultado.empresa.cnpj, "67.954.417/0001-64");
  const dir = path.resolve(__dirname, "../reports/central-gov");
  await fs.mkdir(dir, { recursive: true });
  const browser = await chromium.launch({ headless: true, ...(process.env.GOV_BROWSER_EXECUTABLE ? { executablePath: process.env.GOV_BROWSER_EXECUTABLE } : {}) });
  const achados = [];
  try {
    const anon = await browser.newContext();
    const semSessao = await anon.newPage();
    await semSessao.goto("https://engops.avilaops.com/gov", { timeout: 60000 });
    assert.match(semSessao.url(), /auth\.avilaops\.com\/login/);
    await anon.close();
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await ctx.addCookies([
      { name: "avila_sso", value: resultado.token, domain: "engops.avilaops.com", path: "/", secure: true, httpOnly: true, sameSite: "Lax" },
      { name: "engops_empresa", value: resultado.empresa.id, domain: "engops.avilaops.com", path: "/", secure: true, httpOnly: true, sameSite: "Lax" },
    ]);
    const page = await ctx.newPage();
    page.setDefaultTimeout(45000);
    page.setDefaultNavigationTimeout(60000);
    page.on("pageerror", e => achados.push(e.message));
    const base = "https://engops.avilaops.com/gov";
    if (process.argv.includes("--coletas")) {
      await page.goto(base + "?visao=coleta&busca=referencia-de-verificacao");
      await page.getByRole("heading", { name: "Central GOV", exact: true }).waitFor();
      const cards = page.locator(".gov-results > section");
      assert.equal(await cards.count(), 8, "oito fluxos exibidos");
      assert.equal(await page.getByRole("button", { name: /^(Pausar|Retomar) coleta / }).count(), 8, "controle disponível ao proprietário em cada fluxo");
      await page.getByRole("button", { name: "Atualizar situação", exact: true }).click();
      await page.getByRole("heading", { name: "Central GOV", exact: true }).waitFor();
      assert.equal(new URL(page.url()).searchParams.get("busca"), "referencia-de-verificacao", "atualização preserva filtros da navegação");
      assert.equal(await page.getByRole("button", { name: /^(Pausar|Retomar) coleta / }).count(), 8);
      await page.screenshot({ path: path.join(dir, "coletas-desktop.png"), fullPage: true });
      await page.setViewportSize({ width: 390, height: 844 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, "controles móveis sem overflow");
      await page.screenshot({ path: path.join(dir, "coletas-mobile.png"), fullPage: true });
      assert.deepEqual(achados, [], "sem erros no navegador");
      const evidencia = { coletas: 8, controlesProprietario: true, atualizacaoManual: true, responsivo: true, alteracoesDeColetaExecutadas: false, verificadoEm: new Date().toISOString() };
      await fs.writeFile(path.join(dir, "coletas-resultado.json"), JSON.stringify(evidencia, null, 2));
      console.log(JSON.stringify(evidencia));
      return;
    }
    await page.goto(base + "?fonte=compras&inicio=2026-11-01&fim=2026-11-15");
    await page.getByRole("heading", { name: "Central GOV", exact: true }).waitFor();
    assert.ok(await page.locator("article.gov-card").count(), "fonte Compras retornou oportunidades reais");
    const titulo = await page.locator("article.gov-card h2").first().innerText();
    await page.screenshot({ path: path.join(dir, "desktop.png"), fullPage: true });
    if (process.argv.includes("--salvar")) {
      await page.getByRole("button", { name: "Salvar oportunidade", exact: true }).first().click();
      await page.getByText("Oportunidade salva nesta empresa.", { exact: true }).first().waitFor();
      await page.goto(base + "?fonte=salvas");
      await page.getByRole("heading", { name: titulo, exact: true }).waitFor();
      const card = page.locator("article.gov-card").filter({ has: page.getByRole("heading", { name: titulo, exact: true }) });
      await card.getByLabel("Notas da empresa").fill("Consulta inicial pela Central GOV.");
      await card.getByLabel("Situação da análise").selectOption("EM_ANALISE");
      await card.getByRole("button", { name: "Atualizar análise" }).click();
      await card.getByText("Análise atualizada.", { exact: true }).waitFor();
      await page.reload();
      assert.equal(await card.getByLabel("Notas da empresa").inputValue(), "Consulta inicial pela Central GOV.");
      if (resultado.outra) {
        await ctx.addCookies([{ name: "engops_empresa", value: resultado.outra.id, domain: "engops.avilaops.com", path: "/", secure: true, httpOnly: true, sameSite: "Lax" }]);
        await page.goto(base + "?fonte=salvas");
        assert.equal(await page.getByRole("heading", { name: titulo, exact: true }).count(), 0, "salvo não vaza para outro tenant");
        await ctx.addCookies([{ name: "engops_empresa", value: resultado.empresa.id, domain: "engops.avilaops.com", path: "/", secure: true, httpOnly: true, sameSite: "Lax" }]);
      }
    }
    await page.goto(base + "?fonte=compras&inicio=2026-11-01&fim=2026-11-15&pagina=2");
    assert.ok(await page.locator(".gov-coverage").innerText().then(v => /página 2/i.test(v)), "paginação remota");
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, "layout móvel sem overflow");
    await page.screenshot({ path: path.join(dir, "mobile.png"), fullPage: true });
    if (process.argv.includes("--datas")) {
      await page.goto(base + "/fontes?fonte=planejamento&cnpj=02042388000119&inicio=2022-12-31&fim=2022-12-31");
      assert.ok(await page.locator("article.gov-card").count(), "PCA encontra itens publicados no dia final completo");
      assert.match(await page.locator(".gov-coverage").innerText(), /itens de planejamento informados pela fonte/i);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, "PCA móvel sem overflow");
      await page.screenshot({ path: path.join(dir, "datas-pca-mobile.png"), fullPage: true });
      await page.goto(base + "/fontes?fonte=compras&inicio=2026-11-13&fim=2026-11-13");
      assert.ok(await page.locator("article.gov-card").count(), "Compras encontra publicações quando início e fim são o mesmo dia");
      assert.equal(await page.locator(".gov-error").count(), 0, "consulta do dia completo sem erro");
    }
    if (process.argv.includes("--global")) {
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.goto(base);
      await page.getByRole("link", { name: "Busca global", exact: true }).waitFor();
      assert.ok(await page.locator("article.gov-card").count(), "catálogo contém oportunidades reais indexadas");
      const total = await page.locator(".stat").first().innerText();
      assert.match(total, /Registros compatíveis na base/i);
      const tituloIndexado = await page.locator("article.gov-card h2").first().innerText();
      const termos = tituloIndexado.split(/\s+/).slice(0, 5).join(" ").slice(0, 190).replace(/\s+\S*$/, "");
      await page.goto(base + "?busca=" + encodeURIComponent(termos));
      assert.ok(await page.locator("article.gov-card").count(), "busca textual encontra registro indexado");
      await page.goto(base + "?visao=analise");
      await page.getByRole("heading", { name: "Órgãos • 20 maiores grupos", exact: true }).waitFor();
      assert.ok(await page.locator("meter").count(), "análise calculada com dados reais");
      await page.goto(base + "?visao=coleta");
      assert.equal(await page.getByText("Páginas processadas", { exact: true }).count(), 8, "oito fluxos de coleta visíveis");
      await page.goto(base + "?visao=salvas");
      assert.ok(await page.locator("article.gov-card").count(), "salvo anterior preservado");
      assert.equal(await page.getByLabel("Notas da empresa").first().inputValue(), "Consulta inicial pela Central GOV.");
      if (resultado.outra) {
        await ctx.addCookies([{ name: "engops_empresa", value: resultado.outra.id, domain: "engops.avilaops.com", path: "/", secure: true, httpOnly: true, sameSite: "Lax" }]);
        await page.goto(base + "?visao=salvas");
        assert.equal(await page.getByLabel("Notas da empresa").count(), 0, "notas não vazam para outra empresa");
        await ctx.addCookies([{ name: "engops_empresa", value: resultado.empresa.id, domain: "engops.avilaops.com", path: "/", secure: true, httpOnly: true, sameSite: "Lax" }]);
      }
      await page.goto(base);
      await page.screenshot({ path: path.join(dir, "global-desktop.png"), fullPage: true });
      await page.setViewportSize({ width: 390, height: 844 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, "busca global móvel sem overflow");
      await page.screenshot({ path: path.join(dir, "global-mobile.png"), fullPage: true });
    }
    assert.deepEqual(achados, [], "sem erros no navegador");
    const evidencia = { empresa: resultado.empresa, fonte: "Compras.gov.br", oportunidadesReais: true, paginacao: true, responsivo: true, persistenciaEIsolamento: process.argv.includes("--salvar") || process.argv.includes("--global"), buscaGlobalEAnalise: process.argv.includes("--global"), consultasDiaCompleto: process.argv.includes("--datas"), verificadoEm: new Date().toISOString() };
    await fs.writeFile(path.join(dir, "resultado.json"), JSON.stringify(evidencia, null, 2));
    console.log(JSON.stringify(evidencia));
  } finally { await browser.close(); }
}
verificar().catch(e => { console.error(e.message); process.exitCode = 1; });
