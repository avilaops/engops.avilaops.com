# Arquitetura

## Camadas

```
src/app/            UI (páginas, server actions, rotas de API)
src/components/     componentes React (sem regra de negócio)
src/servicos/       aplicação: casos de uso que tocam o banco e emitem eventos
src/dominio/        regras puras: estados, transições, validação, checklist
src/automation/     motor de jobs (core), workflows, adapters de sistemas externos
src/lib/            sessão, tenant, RBAC, storage, auditoria, formatação
prisma/             modelo de dados e migrações
```

Regras:

- Componente React não contém regra de negócio. Ele chama uma server action, que chama um serviço.
- `src/dominio` não importa Prisma nem Next. É onde ficam os testes mais baratos.
- `src/automation/core` não conhece SIMIL. Só `src/automation/adapters/*` conhece.
- Toda escrita relevante passa por `auditar()` e, quando interessa a alguém de fora, por `emitirEvento()`, na mesma transação.

## Pedido e resposta

```
navegador → server action (src/app/acoes) → exigirOperador() → pode(papel, ação)
         → serviço (src/servicos) → prisma + auditoria + outbox → revalidarDemanda()
```

`exigirOperador()` resolve sessão SSO + empresa escolhida + papel. Sem sessão
manda para o login único; sem empresa manda escolher.

## Motor de automação

```
enfileirar(pedido) ─┐
                    ▼
        jobs (Postgres, FOR UPDATE SKIP LOCKED)
                    │
   worker (instrumentation.ts, ENGOPS_WORKER=1)
                    │
   reclamar() → processar(job) → etapa[etapaAtual]... → concluir | pausar | falhar
```

- Etapa devolve `ok`, `pausar` (job vira WAITING_USER) ou `concluir`.
- `retomar()` põe o job de volta na fila a partir de `etapaAtual`.
- Falha retentável agenda nova tentativa com backoff (30 s, 2 min, 8 min).
- Cada mensagem vai para `eventos_job`: é a timeline que a tela mostra.

Detalhe em [AUTOMATION-ENGINE.md](AUTOMATION-ENGINE.md).

## Modo sombra

`Empresa.modoAutomacao` nasce `SOMBRA`. O workflow prepara tudo, cria a
`ExecucaoExterna` com os campos exatos e uma `Aprovacao`. A pessoa executa no
sistema externo à mão, compara e confirma (ou recusa com motivo). Só em `REAL`
o adapter tenta enviar, e hoje ele responde `DRIVER_NOT_AVAILABLE`.

## Integração com o ecossistema

Ver [ECOSSISTEMA-AVILA-OPS.md](ECOSSISTEMA-AVILA-OPS.md),
[EVENTOS-DE-DOMINIO.md](EVENTOS-DE-DOMINIO.md) e
[CONTRATOS-DE-INTEGRACAO.md](CONTRATOS-DE-INTEGRACAO.md).

## Deploy

Build standalone na máquina de desenvolvimento, `standalone.tgz` para
`/opt/engops` no `apps-noclient`, imagem de runtime, porta 3130 em loopback,
Caddy na frente, Postgres 18 do host. Scripts em `deploy/`.
