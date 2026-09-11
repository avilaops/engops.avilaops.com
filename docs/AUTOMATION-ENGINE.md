# Automation Engine

Código em `src/automation/`.

## Conceitos

| Conceito | Onde | O que é |
|---|---|---|
| Workflow | `core/tipos.ts`, registrado em `workflows/index.ts` | Lista ordenada de etapas com nome e rótulo. |
| Etapa | `core/tipos.ts` | Função `executar(ambiente)` que devolve `ok`, `pausar` ou `concluir`. Deve ser idempotente. |
| Job | tabela `jobs` | Uma execução de um workflow para uma empresa (e normalmente uma demanda). Guarda `etapaAtual`, `contexto`, `status`, lease. |
| Evento de job | tabela `eventos_job` | Timeline: "14:31:06 28 campos validados". |
| Execução externa | tabela `execucoes_externas` | Cada passagem por SIMIL, RAE ou SIOPI, com os campos preparados e a evidência. |
| Aprovação | tabela `aprovacoes` | Decisão humana ligada a um job. Aprovar ou recusar retoma o job. |
| Adapter | `adapters/*.ts` | Único lugar que conhece o sistema externo: mapeia campos, executa, healthcheck. |

## Estados do job

```
QUEUED ──reclamar──▶ RUNNING ──etapa devolve pausar──▶ WAITING_USER ──retomar──▶ QUEUED
                       │
                       ├── todas as etapas ok ──▶ SUCCESS
                       ├── erro retentável ──▶ RETRYING (agendadoPara = agora + backoff) ──▶ RUNNING
                       └── erro não retentável ou tentativas esgotadas ──▶ FAILED ──retomar──▶ QUEUED
qualquer estado não terminal ──cancelar──▶ CANCELLED
```

## Garantias

- **Idempotência.** `chaveIdempotencia` é única. `enfileirar()` devolve o job existente. A chave da preparação do SIMIL inclui `atualizadoEm` da demanda: mudou o cadastro, é outra preparação.
- **Retomada.** Cada etapa concluída grava `etapaAtual + 1` e o `contexto`. Worker que morre deixa o lease (`travadoAte`, 90 s) vencer; outro worker reclama e continua da etapa atual, não do zero.
- **Concorrência.** `reclamar()` usa `UPDATE ... WHERE id = (SELECT ... FOR UPDATE SKIP LOCKED LIMIT 1)`. Dois workers nunca pegam o mesmo job.
- **Pausa para gente.** Etapa devolve `{ tipo: "pausar", motivo }`. O job sai da fila sem consumir tentativa.
- **Erro tipado.** `ErroAutomacao(codigo, mensagem, { retentavel })`. `explicarErro(codigo)` devolve título, motivo, o que o sistema fez, o que fazer e se pode tentar de novo. Lista em `core/erros.ts`.
- **Isolamento.** `processar()` recusa job cuja demanda não pertence à empresa do job.

## Workflow `preparar-simil`

1. Carregar dados da demanda.
2. Validar pendências e divergências (`revalidarDemanda`). Bloqueio → `VALIDATION_BLOCKED`, sem retry.
3. Mapear campos (`adapters/simil.ts`). Campo obrigatório vazio → `MISSING_REQUIRED_DATA`.
4. Gerar prévia: `ExecucaoExterna` (AGUARDANDO_APROVACAO) + `Aprovacao` (PENDENTE) + demanda em `SIMIL_PENDENTE` + eventos `SIMILPreparado` e `AprovacaoSolicitada`. Devolve `pausar`.
5. Executar: lê a aprovação. Recusada → cancela a execução e `APPROVAL_REJECTED`. Aprovada em SOMBRA → execução CONCLUIDA com evidência de confirmação manual. Aprovada em REAL → chama `executarSimil()` (hoje `DRIVER_NOT_AVAILABLE`). Demanda vai a `SIMIL_CONCLUIDO`, evento `SIMILConcluido`.

## Worker

`src/instrumentation.ts` liga `iniciarWorker()` quando `ENGOPS_WORKER=1`. Um
laço reclama e processa um job por vez (3 s de espera quando a fila está vazia)
e um segundo laço entrega a outbox a cada 10 s. Sem a variável (desenvolvimento
sem worker), a tela de Automações mostra "Processar fila agora".

## Como adicionar um workflow

1. Criar `src/automation/workflows/<nome>.ts` exportando um `Workflow`.
2. Registrar em `workflows/index.ts`.
3. Conhecimento do sistema externo vai em `adapters/<sistema>.ts`, nunca na etapa.
4. Um serviço em `src/servicos/automacoes.ts` monta a chave de idempotência e chama `enfileirar()`.
5. Teste de domínio para o adapter (mapeamento) e teste de fila (idempotência).

## O que ainda não existe

- Driver real de SIMIL, RAE e SIOPI. Decisão do produto: só depois de execuções validadas em sombra e da resposta sobre API oficial ou autorização de uso automatizado.
- Healthcheck que bloqueia lote quando a integração está quebrada (a função existe em cada adapter; o bloqueio de lote entra na Fase 8).
- Processamento em lote (Fase 8).
