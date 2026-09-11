#!/usr/bin/env bash
# Build standalone na máquina de desenvolvimento e empacotamento em standalone.tgz.
#
# Três armadilhas conhecidas (ver memória deploy-app-empacotamento):
# 1. nunca gerar o .tgz dentro da pasta empacotada;
# 2. .next/static não entra sozinho, e não pode ser de outro build: rm -rf .next antes;
# 3. o standalone leva .env e .git junto se a raiz de rastreamento for o projeto: excluir.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "▸ conferindo"
npm run conferir

echo "▸ build"
rm -rf .next
npm run build

echo "▸ montando standalone"
rm -rf .next/standalone/.next/static
cp -r .next/static .next/standalone/.next/
cp -r public .next/standalone/public
mkdir -p .next/standalone/prisma
cp -r prisma/schema.prisma prisma/migrations .next/standalone/prisma/

SAIDA="${1:-$(mktemp -d)/standalone.tgz}"
tar --force-local -czf "$SAIDA" -C .next/standalone \
  --exclude='./.git' --exclude='./.env*' --exclude='./storage' --exclude='./tests' \
  --exclude='./tsconfig.tsbuildinfo' --exclude='./standalone.tgz' .

echo "▸ conferindo o pacote"
tar --force-local -tzf "$SAIDA" | grep -cE '^\./server\.js$' | grep -q 1
if [ "$(tar --force-local -tzf "$SAIDA" | grep -cE '^[.]/([.]env|[.]git/|secrets/)')" != "0" ]; then echo "! segredo dentro do pacote"; exit 1; fi
tar --force-local -tzf "$SAIDA" | grep -q '\.css$' || { echo "! sem CSS no pacote"; exit 1; }
echo "· $(du -h "$SAIDA" | cut -f1) em $SAIDA"
echo "$SAIDA"
