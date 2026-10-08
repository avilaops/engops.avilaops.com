# Eventos de domínio

Definidos em `src/dominio/eventos.ts`, gravados em `eventos_dominio` na mesma
transação do fato e entregues ao n8n por `src/automation/outbox.ts`.

## Envelope

```json
{
  "id": "cuid do evento",
  "evento": "DemandaCriada",
  "empresa": { "id": "...", "slug": "silveira-cruz", "nome": "Silveira Cruz Engenharia" },
  "payload": { "demandaId": "...", "codigo": "ENG-0012", "numeroOs": "18453" },
  "criadoEm": "2026-09-11T14:31:02.000Z"
}
```

POST em `N8N_WEBHOOK_URL`, header `x-avila-webhook-token: <N8N_WEBHOOK_TOKEN>`.
Entrega com até 10 tentativas; o `id` é estável, então o consumidor pode
deduplicar.

## Catálogo

| Evento | Quando | Payload | Consumidor típico |
|---|---|---|---|
| `DemandaCriada` | OS criada (tela ou serviço) | demandaId, codigo, numeroOs, tipoServico, prazo | CRM (vincular ao cliente), Planner |
| `DemandaAtribuida` | responsável mudou | demandaId, responsavelId | Planner, notificação |
| `DemandaStatusAlterado` | qualquer mudança de estado | demandaId, codigo, de, para | CRM (resumo), portal |
| `DemandaPronta` | entrou em PRONTA_PARA_PROCESSAMENTO | demandaId, codigo | notificação interna |
| `DocumentoSolicitado` | (reservado) pedido de documento ao cliente | demandaId, tipo | WhatsApp/e-mail via n8n |
| `DocumentoEnviado` | arquivo entrou no dossiê | demandaId, documentoId, tipo, categoria, versao | portal, auditoria externa |
| `DocumentoRemovido` | arquivo removido | demandaId, documentoId, tipo | |
| `ValidacaoFalhou` | preparação bloqueada por pendência | demandaId, jobId, bloqueios[] | Planner ("revisar divergência") |
| `AutomacaoIniciada` | job enfileirado | jobId, workflow, demandaId, modo | analytics |
| `AutomacaoPausada` | job esperando pessoa | jobId, demandaId, motivo | notificação |
| `AutomacaoFalhou` | job FAILED | jobId, demandaId, codigo, mensagem | notificação, analytics |
| `AutomacaoConcluida` | job SUCCESS | jobId, demandaId, workflow | analytics |
| `SIMILPreparado` | prévia gerada | demandaId, jobId, execucaoId, modo, resumo | |
| `SIMILConcluido` | execução concluída (sombra confirmada ou real) | demandaId, jobId, execucaoId, modo | CRM, portal |
| `RAEGerado` | (Fase 6) | | |
| `SIOPIConcluido` | (Fase 7) | | |
| `AprovacaoSolicitada` | aprovação criada | demandaId, aprovacaoId, tipo | Planner ("aprovar envio ao SIMIL"), notificação |
| `AprovacaoConcedida` / `AprovacaoRejeitada` | decisão | aprovacaoId, demandaId, jobId, tipo, decididaPor | |
| `PrazoEmRisco` | (Fase 9, agendado) | demandaId, prazo | WhatsApp, Planner |
| `DemandaEntregue` | entrou em ENTREGUE | demandaId, codigo | WhatsApp/e-mail ao cliente, CRM |

## Regras

- Evento descreve o fato passado; nunca é comando.
- Payload leva ids e o mínimo para o consumidor decidir; quem precisa de mais consulta a API de serviço.
- Texto de mensagem (WhatsApp, e-mail) não está no evento nem no código: é template no n8n.
