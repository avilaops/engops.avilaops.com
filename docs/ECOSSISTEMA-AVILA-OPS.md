# EngOps no ecossistema Ávila Ops

```
                    ÁVILA OPS
        auth (login único) · n8n (motor de integrações) · R2 (arquivos)
                       │
                    ENGOPS
   Demandas · Dossiê · Validação · Motor de automação · Auditoria
                       │ eventos (outbox → n8n)
      ┌────────────────┼──────────────────┐
     CRM         WhatsApp / e-mail    Planner / Todoist
  (resumo da OS)  (avisos ao cliente)   (tarefas humanas)
```

## O que é compartilhado hoje

| Capacidade | Como o EngOps usa |
|---|---|
| Login único (`auth.avilaops.com`) | cookie `avila_sso`, verificação local |
| n8n | destino da outbox de eventos; único caminho para WhatsApp, e-mail e CRM |
| Cloudflare R2 | dossiê, mesmo desenho do `app.avilaops.com` |
| Tema noturno | `packages/tema-noturno`, vendorizado |
| Padrão visual iOS | tokens e componentes do `app.avilaops.com` reescritos |
| Servidor `apps-noclient` | mesma caixa do CRM, SMS e ArxisVR; Postgres 18 do host |
| Regras da casa | TypeScript estrito, português, sem Stripe, `npm run conferir` como portão, trava de dados falsos |

## O que é específico do EngOps (fica em `engops/`)

Demandas Caixa, Ordens de Serviço, dossiê por OS, checklist, detector de
pendências, validador cruzado, SIMIL/RAE/SIOPI, aprovações, SLA, execuções e
evidências, auditoria operacional.

## O que pode virar package depois

| Módulo hoje | Package futuro | Condição |
|---|---|---|
| `src/automation/core` | `@avila-ops/automation-core` | segundo produto precisar de fila com retomada e aprovação (Saúde Pet, Lojas) |
| `src/lib/storage.ts` + `Documento` | `@avila-ops/documents` | segundo produto precisar de dossiê versionado |
| `src/lib/auditoria.ts` + `Auditoria` + `EventoDominio` | `@avila-ops/audit` | idem |
| `src/lib/tenant.ts` + `Membro` | `@avila-ops/tenant` | quando o auth passar a carregar empresa no token, ou quando três apps repetirem esta tabela |

A regra para extrair: só quando o segundo consumidor existir. Package com um
consumidor é pasta com nome bonito.

## Comercial

O EngOps pode ser vendido sozinho (a empresa de engenharia só vê o EngOps e o
login), e por trás já usa auth, n8n, R2 e servidor da casa. Contratar CRM,
WhatsApp ou outros módulos depois é ligar consumidores nos eventos que já
saem, sem migração.
