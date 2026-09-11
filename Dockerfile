# Imagem de RUNTIME. O build Next (standalone) é feito na máquina do Nicolas e
# chega pronto em standalone.tgz: o servidor não tem RAM nem disco para buildar.
# Fluxo completo em deploy/subir.sh e no README.
FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production PORT=3130 HOSTNAME=0.0.0.0 \
    PRISMA_QUERY_ENGINE_LIBRARY=/app/node_modules/.prisma/client/libquery_engine-debian-openssl-3.0.x.so.node
WORKDIR /app
ADD standalone.tgz /app/
# O Turbopack referencia @escopo/pacote-<hash> por um alias que o Windows não
# vira symlink. Cria o apelido para qualquer pacote citado no bundle.
RUN set -e; cd /app/node_modules; \
  for ref in $(grep -rhoE '"@[a-z0-9-]+/[a-z0-9.-]+-[0-9a-f]{16}"' /app/.next/server 2>/dev/null | tr -d '"' | sort -u); do \
    escopo="${ref%%/*}"; nome="${ref#*/}"; base="${nome%-*}"; \
    [ -d "$escopo/$base" ] && ln -sfn "$base" "$escopo/$nome" || true; \
  done; \
  for ref in $(grep -rhoE '"[a-z0-9-]+-[0-9a-f]{16}"' /app/.next/server 2>/dev/null | tr -d '"' | sort -u); do \
    base="${ref%-*}"; [ -d "$base" ] && [ ! -e "$ref" ] && ln -sfn "$base" "$ref" || true; \
  done
ARG GIT_SHA=dev
ARG BUILT_AT=
ENV GIT_SHA=$GIT_SHA BUILT_AT=$BUILT_AT
EXPOSE 3130
CMD ["node", "server.js"]
