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
    assert.deepEqual(achados, [], "sem erros no navegador");
    const evidencia = { empresa: resultado.empresa, fonte: "Compras.gov.br", oportunidadesReais: true, paginacao: true, responsivo: true, persistenciaEIsolamento: process.argv.includes("--salvar"), verificadoEm: new Date().toISOString() };
    await fs.writeFile(path.join(dir, "resultado.json"), JSON.stringify(evidencia, null, 2));
    console.log(JSON.stringify(evidencia));
  } finally { await browser.close(); }
}
verificar().catch(e => { console.error(e.message); process.exitCode = 1; });
