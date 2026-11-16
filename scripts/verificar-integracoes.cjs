// Verificação somente leitura • sessões curtas em memória, sem gravar tokens.
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs/promises");
const path = require("node:path");
const { chromium } = require(process.env.GOV_PLAYWRIGHT_MODULE || "playwright");

const remoto = `const {PrismaClient}=require('@prisma/client');const {createHmac}=require('node:crypto');const db=new PrismaClient();
(async()=>{const empresa=await db.empresa.findFirstOrThrow({where:{cnpj:'67.954.417/0001-64'},select:{id:true}});
const codificar=v=>Buffer.from(JSON.stringify(v)).toString('base64url');const agora=Math.floor(Date.now()/1000);
const corpo=codificar({alg:'HS256',typ:'JWT'})+'.'+codificar({sub:'verificacao-integracoes',email:'nicolas@avilaops.com',nome:'Nicolas',papel:'ADMIN',foto:null,iss:'auth.avilaops.com',iat:agora,exp:agora+600});
const token=corpo+'.'+createHmac('sha256',process.env.SSO_JWT_SECRET).update(corpo).digest('base64url');
console.log(JSON.stringify({empresa,token}));await db.$disconnect();})().catch(()=>{process.exitCode=1});`;

async function verificar() {
  const sessao = JSON.parse(execFileSync("ssh", ["-o", "BatchMode=yes", "applications", "docker exec -i -w /app engops-avilaops-com-web node"], { input: remoto, encoding: "utf8", timeout: 45000, windowsHide: true }));
  const pasta = path.resolve(__dirname, "../reports/integracoes");
  await fs.mkdir(pasta, { recursive: true });
  const browser = await chromium.launch({ headless: true, ...(process.env.GOV_BROWSER_EXECUTABLE ? { executablePath: process.env.GOV_BROWSER_EXECUTABLE } : {}) });
  const erros = [];
  try {
    const anonimo = await browser.newContext();
    const testeAnonimo = await anonimo.newPage();
    await testeAnonimo.goto("https://engops.avilaops.com/automacoes/siop");
    assert.match(testeAnonimo.url(), /auth\.avilaops\.com\/login/);
    await anonimo.close();
    const contexto = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await contexto.addCookies([
      { name: "avila_sso", value: sessao.token, domain: "engops.avilaops.com", path: "/", secure: true, httpOnly: true, sameSite: "Lax" },
      { name: "engops_empresa", value: sessao.empresa.id, domain: "engops.avilaops.com", path: "/", secure: true, httpOnly: true, sameSite: "Lax" },
    ]);
    const page = await contexto.newPage();
    page.setDefaultTimeout(45000); page.setDefaultNavigationTimeout(60000);
    page.on("pageerror", erro => erros.push(erro.message));
    page.on("response", resposta => { if (resposta.url().includes("engops.avilaops.com") && resposta.status() >= 500) erros.push(`HTTP ${resposta.status()}`); });
    await page.goto("https://engops.avilaops.com/automacoes");
    for (const nome of ["Abrir SIOP", "Acompanhar RAE", "Acompanhar SIOPI", "Abrir Banco do Brasil"]) assert.equal(await page.getByRole("link", { name: nome, exact: true }).count(), 1);
    const telas = [
      ["siop", "SIOP • Execução orçamentária"],
      ["operacao/rae", "RAE"],
      ["operacao/siopi", "SIOPI • CAIXA"],
      ["operacao/banco-brasil", "Banco do Brasil"],
    ];
    for (const [rota, titulo] of telas) {
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.goto(`https://engops.avilaops.com/automacoes/${rota}`);
      await page.getByRole("heading", { name: titulo, exact: true }).waitFor();
      const nome = rota.replaceAll("/", "-");
      if (rota === "siop") {
        await page.getByRole("heading", { name: "Histórico de consultas", exact: true }).waitFor();
        const habilitada = await page.getByLabel("Habilitar consultas neste ambiente").isChecked();
        if (!habilitada) assert.equal(await page.getByRole("button", { name: "Consultar execução orçamentária" }).isDisabled(), true);
        await page.getByLabel("Ambiente consultado").selectOption("PRODUCAO");
        await page.getByRole("button", { name: "Abrir ambiente", exact: true }).click();
        await page.getByRole("heading", { name: "Configuração • Produção", exact: true }).waitFor();
      } else {
        await page.getByText("Operação manual", { exact: true }).waitFor();
        await page.getByText("Configurar operação", { exact: true }).click();
        await page.getByLabel("Endereço do portal").waitFor();
        await page.getByRole("heading", { name: "Histórico de operações", exact: true }).waitFor();
      }
      await page.screenshot({ path: path.join(pasta, `${nome}-desktop.png`), fullPage: true });
      await page.setViewportSize({ width: 390, height: 844 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${titulo} sem overflow móvel`);
      await page.screenshot({ path: path.join(pasta, `${nome}-mobile.png`), fullPage: true });
    }
    assert.deepEqual(erros, []);
    const resultado = { telas: 4, acessoAnonimoProtegido: true, configuracaoPorAmbiente: true, operacaoManualExplicita: true, responsivo: true, mutacoesExecutadas: false, verificadoEm: new Date().toISOString() };
    await fs.writeFile(path.join(pasta, "resultado.json"), JSON.stringify(resultado, null, 2));
    console.log(JSON.stringify(resultado));
  } finally { await browser.close(); }
}
verificar().catch(() => { console.error("Verificação das integrações falhou • confira o último estágio sem expor a sessão."); process.exitCode = 1; });
