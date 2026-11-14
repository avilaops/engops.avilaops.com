#!/usr/bin/env node
// Migração via túnel SSH local. DATABASE_URL existe apenas na memória dos
// processos; não é gravada, impressa nem passada como argumento de shell.
import { execFileSync, spawn, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { createServer, createConnection } from "node:net";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";

const modo = process.argv[2];
if (!["--validar", "--aplicar", "--conferir"].includes(modo)) throw new Error("Use --validar, --aplicar ou --conferir");
const raiz = fileURLToPath(new URL("../", import.meta.url));
const cli = fileURLToPath(new URL("../node_modules/prisma/build/index.js", import.meta.url));
const ssh = (comando) => execFileSync("ssh", ["-o", "BatchMode=yes", "-o", "ConnectTimeout=10", "applications", comando],
  { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 120000 });
let tunel;
let db;
let testeCriado = false;
const nomeTeste = `engops_siop_test_20261114_${randomUUID().slice(0, 8)}`;
const contrato = JSON.parse(readFileSync(new URL("../docs/contratos/WSExecucaoOrcamentaria.schema.json", import.meta.url), "utf8"));

async function portaLivre() {
  const servidor = createServer();
  await new Promise((resolve, reject) => { servidor.once("error", reject); servidor.listen(0, "127.0.0.1", resolve); });
  const porta = servidor.address().port;
  await new Promise((resolve) => servidor.close(resolve));
  return porta;
}
async function esperarTunel(porta) {
  for (let tentativa = 0; tentativa < 60; tentativa++) {
    if (tunel && tunel.exitCode !== null) throw new Error("Túnel SSH não iniciou");
    const conectado = await new Promise((resolve) => {
      const socket = createConnection({ host: "127.0.0.1", port: porta });
      socket.once("connect", () => { socket.destroy(); resolve(true); });
      socket.once("error", () => resolve(false));
      socket.setTimeout(500, () => { socket.destroy(); resolve(false); });
    });
    if (conectado) return;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error("Túnel SSH indisponível");
}
function prisma(comando, url) {
  const argumentos = comando === "diff" ? ["migrate", "diff", "--from-schema-datasource", "prisma/schema.prisma", "--to-schema-datamodel", "prisma/schema.prisma", "--exit-code"] : ["migrate", comando];
  const resultado = spawnSync(process.execPath, [cli, ...argumentos], {
    cwd: raiz, env: { ...process.env, DATABASE_URL: url }, encoding: "utf8", timeout: 120000,
  });
  // Saída do CLI pode conter detalhes de conexão; somente o resultado é público.
  if (resultado.status !== 0) {
    const conexao = new URL(url);
    let detalhes = `${resultado.stdout ?? ""}\n${resultado.stderr ?? ""}`;
    for (const segredo of [url, conexao.password, decodeURIComponent(conexao.password)].filter(Boolean)) detalhes = detalhes.split(segredo).join("[protegido]");
    detalhes = detalhes.replace(/postgres(?:ql)?:\/\/[^\s]+/g, "[conexão protegida]");
    throw new Error(`Prisma migrate ${comando} falhou: ${detalhes.slice(-2200)}`);
  }
  console.log(JSON.stringify({ etapa: `prisma migrate ${comando}`, resultado: "aprovado" }));
}
async function conferirEstrutura() {
  const colunas = await db.$queryRawUnsafe("SELECT column_name, data_type, numeric_precision, numeric_scale FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1", "siop_execucoes_orcamentarias_pac");
  const campos = contrato.$defs.execucaoOrcamentariaPacDTO.properties;
  for (const [nome, definicao] of Object.entries(campos)) {
    const coluna = colunas.find((item) => item.column_name === nome);
    assert.ok(coluna, `Coluna ausente: ${nome}`);
    if (definicao["x-xsd-type"] === "xs:decimal") {
      assert.equal(coluna.data_type, "numeric");
      assert.equal(coluna.numeric_precision, 16);
      assert.equal(coluna.numeric_scale, 2);
    }
    if (definicao["x-xsd-type"] === "xs:string") assert.equal(coluna.data_type, "text");
    if (definicao["x-xsd-type"] === "xs:int") assert.equal(coluna.data_type, "integer");
  }
  const view = await db.$queryRawUnsafe("SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1", "siop_totais_por_consulta");
  assert.equal(view.length, 25); // seis identificadores/contagem + 19 valores.
  console.log(JSON.stringify({ camposContrato: Object.keys(campos).length, monetariosNumeric16_2: 19, view: "aprovada" }));
}
async function testarIntegridade() {
  if (modo !== "--validar") throw new Error("Dados de teste só são permitidos no banco isolado");
  const empresa = await db.empresa.create({ data: { slug: "teste-siop-a", nome: "Validação SIOP A" } });
  const outra = await db.empresa.create({ data: { slug: "teste-siop-b", nome: "Validação SIOP B" } });
  const credencial = await db.siopCredencial.create({ data: { empresaId: empresa.id, ambiente: "HOMOLOGACAO" } });
  await assert.rejects(db.siopConsulta.create({ data: { empresaId: outra.id, credencialId: credencial.id, ambiente: "HOMOLOGACAO", anoExercicio: 2026, solicitadoPor: "teste@example.org" } }));
  const campos = Object.fromEntries(Object.entries(contrato.$defs.execucaoOrcamentariaPacDTO.properties).map(([nome, definicao]) =>
    [nome, definicao["x-xsd-type"] === "xs:decimal" ? nome === "pago" ? "99999999999999.99" : "0.01" : definicao.type === "integer" ? 2026 : "0032"]));
  const consultas = [];
  for (let indice = 0; indice < 2; indice++) {
    const consulta = await db.siopConsulta.create({ data: { empresaId: empresa.id, credencialId: credencial.id, ambiente: "HOMOLOGACAO", anoExercicio: 2026, solicitadoPor: "teste@example.org" } });
    consultas.push(consulta.id);
    const retorno = await db.siopRetorno.create({ data: { empresaId: empresa.id, consultaId: consulta.id, sucesso: true, mensagensErro: [null, "Diagnóstico"], execucoesPresentes: true } });
    await assert.rejects(db.siopExecucaoOrcamentariaPac.create({ data: { empresaId: outra.id, retornoId: retorno.id, ordem: 0 } }));
    const salvo = await db.siopExecucaoOrcamentariaPac.create({ data: { ...campos, empresaId: empresa.id, retornoId: retorno.id, ordem: 0 } });
    assert.equal(salvo.pago.toFixed(2), "99999999999999.99");
    assert.equal(salvo.localizador, "0032");
    await assert.rejects(db.siopExecucaoOrcamentariaPac.create({ data: { empresaId: empresa.id, retornoId: retorno.id, ordem: 0 } }));
  }
  const totais = await db.$queryRawUnsafe('SELECT "consultaId", "quantidade", "pago" FROM "siop_totais_por_consulta" WHERE "empresaId" = $1', empresa.id);
  assert.equal(totais.length, 2);
  for (const total of totais) { assert.equal(Number(total.quantidade), 1); assert.equal(total.pago.toFixed(2), "99999999999999.99"); }
  assert.equal(await db.siopExecucaoOrcamentariaPac.count({ where: { empresaId: outra.id } }), 0);
  console.log(JSON.stringify({ isolamentoEmpresa: "aprovado", precisaoDecimal: "aprovada", ordemUnica: "aprovada", snapshotsIndependentes: "aprovados", camposPersistidos: 40 }));
}

try {
  const original = ssh("sed -n 's/^DATABASE_URL=//p' /opt/engops/.env").trim().replace(/^['"]|['"]$/g, "");
  const url = new URL(original);
  if (!["postgres:", "postgresql:"].includes(url.protocol)) throw new Error("Banco incompatível");
  const usuarioBanco = decodeURIComponent(url.username);
  const nomeBanco = decodeURIComponent(url.pathname.slice(1));
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(usuarioBanco) || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(nomeBanco)) throw new Error("Identificação de banco inesperada");
  if (modo === "--validar") {
    ssh(`sudo -u postgres createdb --template=template0 --owner=${usuarioBanco} ${nomeTeste}`);
    testeCriado = true;
    url.pathname = `/${nomeTeste}`;
  } else if (modo === "--aplicar") {
    const arquivo = `/var/backups/engops/${nomeBanco}-pre-siop-${new Date().toISOString().replace(/[^0-9]/g, "")}.dump`;
    ssh(`set -eu; install -d -o postgres -g postgres -m 700 /var/backups/engops; sudo -u postgres pg_dump -Fc --file=${arquivo} ${nomeBanco}; chmod 600 ${arquivo}; sudo -u postgres pg_restore --list ${arquivo} >/dev/null`);
    console.log(JSON.stringify({ backup: arquivo, verificacao: "aprovada" }));
  }
  const portaExterna = process.argv.find((arg) => arg.startsWith("--porta="))?.slice(8);
  if (portaExterna && !/^\d{4,5}$/.test(portaExterna)) throw new Error("Porta de túnel inválida");
  const porta = portaExterna ? Number(portaExterna) : await portaLivre();
  if (!portaExterna) tunel = spawn("ssh", ["-o", "BatchMode=yes", "-o", "ExitOnForwardFailure=yes", "-L", `127.0.0.1:${porta}:127.0.0.1:5432`, "-N", "applications"], { stdio: "ignore", windowsHide: true, detached: process.platform === "win32" });
  await esperarTunel(porta);
  url.hostname = "127.0.0.1"; url.port = String(porta);
  if (modo !== "--conferir") prisma("deploy", url.toString());
  prisma("status", url.toString());
  prisma("diff", url.toString());
  db = new PrismaClient({ datasourceUrl: url.toString() });
  await conferirEstrutura();
  if (modo === "--validar") await testarIntegridade();
  else console.log(JSON.stringify({ homologacaoPreparada: await db.siopCredencial.count({ where: { ambiente: "HOMOLOGACAO", habilitada: false } }), consultasImportadas: await db.siopConsulta.count() }));
} catch (erro) {
  // Nunca imprimir stdout/stderr capturados de subprocessos ou a URL protegida.
  console.error(erro instanceof assert.AssertionError ? "Falha na verificação de integridade SIOP" : erro.message);
  process.exitCode = 1;
} finally {
  await db?.$disconnect();
  if (testeCriado) {
    if (!/^engops_siop_test_20261114_[a-f0-9]{8}$/.test(nomeTeste)) throw new Error("Nome de limpeza inválido");
    ssh(`sudo -u postgres dropdb --if-exists --force ${nomeTeste}`);
    console.log(JSON.stringify({ bancoTemporario: "removido" }));
  }
  tunel?.kill();
}
