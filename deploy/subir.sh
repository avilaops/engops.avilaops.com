#!/usr/bin/env bash
# Deploy do EngOps no apps-noclient (204.168.249.111).
#
# Build local → standalone.tgz → /opt/engops → imagem de runtime → migração →
# docker compose up → healthcheck com o commit. Só sai 0 se o /api/health
# responder com a revisão enviada.
#
# Uso: bash deploy/subir.sh
set -euo pipefail
SERVIDOR="${SERVIDOR:-apps-noclient}"
PASTA="/opt/engops"
cd "$(dirname "$0")/.."

if [ -n "$(git status --porcelain)" ]; then
  echo "! Há alteração não commitada. Commite antes de subir:"; git status --short; exit 1
fi
COMMIT="$(git rev-parse --short HEAD)"
AGORA="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "=== EngOps → $SERVIDOR ($COMMIT) ==="

PACOTE="$(mktemp -d)/standalone.tgz"
bash deploy/empacotar.sh "$PACOTE" | tail -1 >/dev/null

echo "▸ enviando"
ssh "$SERVIDOR" "mkdir -p $PASTA/storage && [ -f $PASTA/.env ] || { echo '! falta $PASTA/.env (copie .env.example e preencha)'; exit 1; }"
cat "$PACOTE" | ssh "$SERVIDOR" "cat > $PASTA/standalone.tgz"
scp -q Dockerfile docker-compose.yml "$SERVIDOR:$PASTA/"

echo "▸ migração e subida"
ssh "$SERVIDOR" "bash -s" <<REMOTO
set -euo pipefail
cd $PASTA
# Migração pelo host (o container não tem o CLI do Prisma). A URL do .env usa
# host.docker.internal; no host é 127.0.0.1.
DBURL=\$(grep ^DATABASE_URL= .env | cut -d= -f2- | sed 's/host.docker.internal/127.0.0.1/')
rm -rf prisma && mkdir prisma && tar xzf standalone.tgz -C prisma --strip-components=2 ./prisma
DATABASE_URL="\$DBURL" npx -y prisma@6 migrate deploy --schema prisma/schema.prisma 2>&1 | grep -E "applied|No pending|rror|migration" || true
GIT_SHA=$COMMIT BUILT_AT=$AGORA docker compose build -q
docker compose up -d --force-recreate
docker image prune -f >/dev/null
REMOTO

echo "▸ conferindo"
for i in $(seq 1 25); do
  SAUDE=$(ssh "$SERVIDOR" "curl -sf -m 5 http://127.0.0.1:3120/api/health" 2>/dev/null || true)
  if echo "$SAUDE" | grep -q "\"commit\":\"$COMMIT\""; then echo "· no ar: $SAUDE"; exit 0; fi
  sleep 3
done
echo "! não respondeu com a revisão $COMMIT em 75s"
ssh "$SERVIDOR" "cd $PASTA && docker compose logs --tail 40"
exit 1
