// Migração de produção com backup e conferência do artefato aplicado.
// Segredos permanecem em memória; a URL não é argumento de subprocesso.
import { execFileSync, spawn, spawnSync } from "node:child_process";
import { createServer, createConnection } from "node:net";
import { createHash } from "node:crypto";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";

const modo = process.argv[2];
if (!["--aplicar", "--conferir"].includes(modo)) throw new Error("Use --aplicar ou --conferir.");
const raiz = fileURLToPath(new URL("../", import.meta.url));
const migracao = "0008_integracoes_operacionais";
const checksum = createHash("sha256").update(readFileSync(path.join(raiz, "prisma/migrations", migracao, "migration.sql"))).digest("hex");
const ssh = comando => execFileSync("ssh", ["-o", "BatchMode=yes", "-o", "ConnectTimeout=15", "applications", comando], { encoding: "utf8", timeout: 600000, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
let tunel, db, senha = "", backup = null;
const sanear = mensagem => String(mensagem).split(senha || "[sem segredo]").join("[protegido]").replace(/postgres(?:ql)?:\/\/[^\s]+/g, "[conexão protegida]");
try {
  const original = ssh("sed -n 's/^DATABASE_URL=//p' /opt/engops/.env").trim().replace(/^['\"]|['\"]$/g, "");
  const conexao = new URL(original); senha = decodeURIComponent(conexao.password);
  assert.equal(conexao.pathname, "/engops");
  const reserva = createServer(); await new Promise(r => reserva.listen(0, "127.0.0.1", r));
  const porta = reserva.address().port; await new Promise(r => reserva.close(r));
  tunel = spawn("ssh", ["-o", "BatchMode=yes", "-o", "ExitOnForwardFailure=yes", "-L", `127.0.0.1:${porta}:127.0.0.1:5432`, "-N", "applications"], { stdio: "ignore", windowsHide: true, detached: process.platform === "win32" });
  let pronto = false;
  for (let tentativa = 0; tentativa < 100; tentativa++) {
    if (tunel.exitCode !== null) throw new Error("Túnel encerrado.");
    pronto = await new Promise(r => { const socket = createConnection({ host: "127.0.0.1", port: porta }); socket.once("connect", () => { socket.destroy(); r(true); }); socket.once("error", () => r(false)); socket.setTimeout(500, () => { socket.destroy(); r(false); }); });
    if (pronto) break; await new Promise(r => setTimeout(r, 200));
  }
  assert.ok(pronto, "Túnel indisponível."); conexao.hostname = "127.0.0.1"; conexao.port = String(porta);
  db = new PrismaClient({ datasourceUrl: conexao.toString() });
  const aplicada = await db.$queryRaw`SELECT checksum, finished_at FROM _prisma_migrations WHERE migration_name = ${migracao} AND rolled_back_at IS NULL`;
  if (aplicada.length) { assert.ok(aplicada[0].finished_at, "Migração com falha exige análise."); assert.equal(aplicada[0].checksum, checksum); }
  if (!aplicada.length && modo === "--aplicar") {
    backup = `/var/backups/engops/engops-pre-integracoes-${new Date().toISOString().replace(/\D/g, "")}.dump`;
    console.log("Backup consistente do banco • antes da migração");
    ssh(`set -eu; install -d -o postgres -g postgres -m 700 /var/backups/engops; sudo -u postgres pg_dump -Fc --file=${backup} engops; chmod 600 ${backup}; sudo -u postgres pg_restore --list ${backup} >/dev/null`);
    console.log(JSON.stringify({ backup, arquivoVerificado: true }));
    for (const comando of ["deploy", "status"]) {
      const resultado = spawnSync(process.execPath, [path.join(raiz, "node_modules/prisma/build/index.js"), "migrate", comando], { cwd: raiz, env: { ...process.env, DATABASE_URL: conexao.toString() }, encoding: "utf8", timeout: 120000, windowsHide: true });
      if (resultado.status !== 0) throw new Error(sanear(`${resultado.stdout ?? ""}\n${resultado.stderr ?? ""}`));
      console.log(`Prisma migrate ${comando} • aprovado`);
    }
  }
  const registros = await db.$queryRaw`SELECT checksum, finished_at FROM _prisma_migrations WHERE migration_name = ${migracao} AND rolled_back_at IS NULL`;
  assert.equal(registros.length, 1); assert.ok(registros[0].finished_at); assert.equal(registros[0].checksum, checksum);
  const colunas = await db.$queryRaw`SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'configuracoes_operacionais'`;
  assert.deepEqual(colunas.map(c => c.column_name).sort(), ["id", "empresaId", "sistema", "portalUrl", "unidade", "operacao", "observacoes", "atualizadoPor", "criadoEm", "atualizadoEm"].sort());
  const enums = await db.$queryRaw`SELECT enumlabel FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'SistemaExterno'`;
  assert.ok(enums.some(e => e.enumlabel === "BANCO_BRASIL"));
  const evidencia = { banco: "engops", migracao, checksumConferido: true, colunas: colunas.length, sistemaBancoBrasil: true, backup, verificadoEm: new Date().toISOString() };
  const pasta = path.join(raiz, "reports/integracoes"); mkdirSync(pasta, { recursive: true });
  writeFileSync(path.join(pasta, "banco-producao.json"), JSON.stringify(evidencia, null, 2)); console.log(JSON.stringify(evidencia));
} catch (erro) { console.error(sanear(erro.message)); process.exitCode = 1; }
finally { await db?.$disconnect(); tunel?.kill(); }
