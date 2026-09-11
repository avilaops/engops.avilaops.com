# engops.avilaops.com: EngOps

Sistema operacional das demandas Caixa para empresas e engenheiros que atendem
SIMIL, RAE e SIOPI. Não é um robô: é a operação inteira (OS, dossiê,
validação, aprovação, automação em modo sombra, auditoria), dentro do
ecossistema Ávila Ops.

Origem e decisões: [docs/produtos/CAIXA-OPS.md](../docs/produtos/CAIXA-OPS.md) no monorepo.

## O que já está aqui

| Peça | Estado |
|---|---|
| Login único (auth.avilaops.com), empresas, equipe com papéis | pronto |
| Central de demandas: busca, filtros, tabela, Kanban, prazos | pronto |
| Dossiê por OS: upload, tipo, versão, hash, conferência, download assinado | pronto |
| Detector de pendências, validador cruzado, checklist calculado, próxima ação | pronto |
| Motor de automação: fila em Postgres, idempotência, retomada, retry, pausa, timeline, erro tipado | pronto |
| SIMIL em modo sombra: prepara 16 campos, prévia, aprovação, confirmação, evidência | pronto |
| Aprovações, automações, auditoria, relatórios (30 dias, funil) | pronto |
| Outbox de eventos para o n8n; entrada de demanda por serviço | pronto |
| SIMIL real, RAE, SIOPI, lotes, exportação, notificações, IA | roadmap |

## Rodar

```
cp .env.example .env         # preencher DATABASE_URL, SSO_JWT_SECRET (ou ENGOPS_DEV_EMAIL em dev)
npm install
npm run prisma:migrate       # ou prisma:dev
npm run dev                  # http://localhost:3130
npm run conferir             # typecheck + lint + dados falsos + testes
```

Sem `SSO_JWT_SECRET`, em desenvolvimento, `ENGOPS_DEV_EMAIL=nicolas@avilaops.com`
simula a sessão. Sem `ENGOPS_WORKER=1` a tela de Automações mostra "Processar
fila agora".

## Deploy

`bash deploy/subir.sh`. Servidor `apps-noclient`, pasta `/opt/engops`, porta
3130, Postgres 18 do host (banco `engops`), Caddy em `deploy/Caddyfile.snippet`.
Registro no SSO: `auth.avilaops.com/src/lib/apps.ts` (id `engops`).

## Documentação

- [docs/AUDITORIA-INICIAL.md](docs/AUDITORIA-INICIAL.md)
- [docs/ARQUITETURA.md](docs/ARQUITETURA.md)
- [docs/AUTOMATION-ENGINE.md](docs/AUTOMATION-ENGINE.md)
- [docs/MODELO-DE-DADOS.md](docs/MODELO-DE-DADOS.md)
- [docs/ROADMAP.md](docs/ROADMAP.md)
- [docs/ECOSSISTEMA-AVILA-OPS.md](docs/ECOSSISTEMA-AVILA-OPS.md)
- [docs/EVENTOS-DE-DOMINIO.md](docs/EVENTOS-DE-DOMINIO.md)
- [docs/CONTRATOS-DE-INTEGRACAO.md](docs/CONTRATOS-DE-INTEGRACAO.md)
