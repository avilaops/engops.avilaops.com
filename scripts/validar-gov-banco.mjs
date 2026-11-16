import { execFileSync, spawn, spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createServer, createConnection } from "node:net";
import { fileURLToPath } from "node:url";
import path from "node:path";

const raiz = fileURLToPath(new URL("../", import.meta.url));
const ssh = comando => execFileSync("ssh", ["-o", "BatchMode=yes", "-o", "ConnectTimeout=15", "applications", comando], { encoding: "utf8", timeout: 120000, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
const nome = `engops_gov_test_${randomUUID().replaceAll("-", "").slice(0, 10)}`;
let tunel, criado = false, segredo = "";
const sanear = mensagem => String(mensagem).split(segredo || "[sem segredo]").join("[protegido]").replace(/postgres(?:ql)?:\/\/[^\s]+/g, "[conexão protegida]");
function executar(arquivo, args, env) {
  const r = spawnSync(process.execPath, [arquivo, ...args], { cwd: raiz, env: { ...process.env, ...env }, encoding: "utf8", timeout: 600000, windowsHide: true });
  console.log(sanear(`${r.stdout ?? ""}\n${r.stderr ?? ""}`).trim());
  if (r.status !== 0) throw new Error(`Verificação falhou • ${path.basename(arquivo)} • ${r.status}`);
}
try {
  const protegido = ssh("grep '^DATABASE_URL=' /opt/engops/.env").trim().slice("DATABASE_URL=".length).replace(/^['\"]|['\"]$/g, "");
  const conexao = new URL(protegido); segredo = decodeURIComponent(conexao.password);
  const dono = decodeURIComponent(conexao.username);
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(dono)) throw new Error("Identificação do banco inválida");
  ssh(`sudo -u postgres createdb --template=template0 --owner=${dono} ${nome}`); criado = true;
  const servidor = createServer(); await new Promise(r => servidor.listen(0, "127.0.0.1", r));
  const porta = servidor.address().port; await new Promise(r => servidor.close(r));
  tunel = spawn("ssh", ["-o", "BatchMode=yes", "-o", "ExitOnForwardFailure=yes", "-L", `127.0.0.1:${porta}:127.0.0.1:5432`, "-N", "applications"], { stdio: "ignore", windowsHide: true, detached: process.platform === "win32" });
  let pronto = false;
  for (let tentativa = 0; tentativa < 100; tentativa++) {
    if (tunel.exitCode !== null) throw new Error("Túnel encerrado antes da verificação");
    pronto = await new Promise(r => { const s = createConnection({ host: "127.0.0.1", port: porta }); s.once("connect", () => { s.destroy(); r(true); }); s.once("error", () => r(false)); s.setTimeout(500, () => { s.destroy(); r(false); }); });
    if (pronto) break; await new Promise(r => setTimeout(r, 200));
  }
  if (!pronto) throw new Error("Túnel de teste não iniciou");
  conexao.hostname = "127.0.0.1"; conexao.port = String(porta); conexao.pathname = `/${nome}`;
  const env = { DATABASE_URL: conexao.toString(), GOV_TEST_DATABASE_URL: conexao.toString() };
  executar(path.join(raiz, "node_modules/prisma/build/index.js"), ["migrate", "deploy"], env);
  executar(path.join(raiz, "node_modules/prisma/build/index.js"), ["migrate", "diff", "--from-schema-datasource", "prisma/schema.prisma", "--to-schema-datamodel", "prisma/schema.prisma", "--exit-code"], env);
  executar(path.join(raiz, "node_modules/vitest/vitest.mjs"), ["run", "tests/integration/gov-banco.test.ts"], env);
} catch (e) { console.error(sanear(e.message)); process.exitCode = 1; }
finally {
  try {
    if (criado) { if (!/^engops_gov_test_[a-f0-9]{10}$/.test(nome)) throw new Error("Nome de limpeza inválido"); ssh(`sudo -u postgres dropdb --if-exists --force ${nome}`); console.log("Banco isolado removido"); }
  } finally { tunel?.kill(); }
}
