# Auditoria inicial (Fase 0)

Data: 11/09/2026. Escopo: o que o ecossistema Ávila Ops já tem e que o EngOps
reutiliza ou integra, e o que não existe apesar de constar no plano.

## 1. Estado do projeto

Antes desta auditoria a pasta `engops/` tinha só o símbolo (`simbolo.png`).
Não havia código, banco, repositório nem domínio. Tudo o que está aqui nasceu
em 11/09/2026 a partir de [docs/produtos/CAIXA-OPS.md](../../docs/produtos/CAIXA-OPS.md)
do monorepo.

## 2. O que existe no ecossistema e como o EngOps usa

| Capacidade | Onde está | Estado real | Decisão no EngOps |
|---|---|---|---|
| Login único | `auth.avilaops.com`, cookie `avila_sso` em `.avilaops.com`, JWT HS256 com `SSO_JWT_SECRET`, issuer `auth.avilaops.com`, claims `sub, email, nome, foto, papel` (`ADMIN` para `@avilaops.com`, `CLIENTE` para o resto) | Em produção. Apps se registram em `src/lib/apps.ts` (lista `APPS`); `podeEntrar()` decide. Sem claim de empresa no token. | **Reutilizado.** `src/lib/sessao.ts` verifica o cookie com o mesmo segredo. Registro `engops` acrescentado em `apps.ts` do auth (host `engops.avilaops.com`, `papelExigido: null`). |
| Tenant / empresa | Cada app tem o seu: `app.avilaops.com` liga conta a `organization_id` (uma por usuário); lojas resolve por host; CRM por `tenant_id`. Não existe pacote compartilhado. | Sem padrão único. | **Próprio.** `Empresa` + `Membro (empresa, email, papel)`. Uma pessoa pode ser membro de várias empresas. Dono da plataforma (`ENGOPS_DONOS`) entra em todas. |
| RBAC | `app.avilaops.com` tem OWNER/SOCIO/ADMIN/CLIENT (pessoas diferentes, não níveis). Auth só conhece ADMIN/CLIENTE. | Específico do app. | **Próprio.** ADMIN, GESTOR, OPERADOR, REVISOR, CONSULTA por ação (`src/lib/rbac.ts`). |
| CRM | Dois: `crm.avilaops.com` (Vite + Fastify + SQL, `contacts/companies/leads`, API só com sessão humana) e `app.avilaops.com` (`Organization`, `Lead`). Não compartilham banco. | Nenhum expõe API de serviço para criar cliente. | **Não integrado agora.** EngOps tem `Cliente` mínimo (contratante da OS). Integração vai por evento na outbox (`DemandaCriada` etc.) que o n8n roteia. |
| Portal do Cliente | `cliente.avilaops.com` foi removido do Hetzner em 24/08/2026; a área do cliente virou `app.avilaops.com/portal`. | Não existe como produto reutilizável. | **Adiado.** O modelo já separa `OrigemDocumento.PORTAL` e evento `DocumentoSolicitado`; a tela do cliente entra quando o portal existir. |
| Planner | Não existe. As tarefas humanas da casa vivem no Todoist. | Inexistente. | **Via evento.** `AprovacaoSolicitada`, `ValidacaoFalhou`, `PrazoEmRisco` saem na outbox; o n8n cria a tarefa onde a empresa quiser. |
| Mensageria / e-mail | Tudo por n8n: `chamarN8n()` com header `x-avila-webhook-token`; webhook `avila-ops-send-email`. WhatsApp não tem helper de envio no app. | Em produção via n8n. | **Reutilizado no mesmo desenho.** `src/automation/outbox.ts` entrega os eventos a `N8N_WEBHOOK_URL` com `x-avila-webhook-token`. Texto de mensagem não fica no código. |
| Documentos / storage | `app.avilaops.com/src/lib/r2.ts`: Cloudflare R2 via SDK S3, URL assinada de 5 min, fallback em disco com prefixo `local:`. | Em produção, mas é código do app, não pacote. | **Mesmo desenho copiado** em `src/lib/storage.ts`, com hash, versão e chave por dossiê. Candidato a virar `@avila-ops/documents`. |
| IA | `app.avilaops.com/packages/avila-ai-core` (`@avila-ops/ai-core`): cliente, tools com aprovação, limites de gasto, redact. Agnóstico de Prisma. | Workspace interno do app; `AI_CORE_ENABLED=false` por padrão. | **Fase 10.** As tools do copiloto (`getDemand`, `getValidationIssues`...) vão consumir `src/servicos/*`. |
| Observabilidade | `infra-observabilidade/` (Grafana etc.) e healthcheck por app. | Existe para infra. | `/api/health` devolve banco, commit e worker. Logs estruturados por job em `eventos_job`. |
| Tema | `packages/tema-noturno` (18h escurece, 6h clareia), vendorizado por `sincronizar.mjs`. | Em produção. | **Reutilizado.** `engops/src/lib/tema-noturno` entrou na lista do sincronizador. |
| Design system | Não existe pacote. `app.avilaops.com/globals.css` (6.884 linhas) e `docs/auditoria-mobile-ios.md` são o padrão de fato. | Padrão iOS só no app. | **Mesmos tokens e componentes** (`AppShell`, `MobileNav`, `Sheet`, `Segmented`, `.ios-list`, `.field`) reescritos enxutos em `globals.css` (400 linhas). |
| Scaffold | `packages/create-avilaops` gera Next 16 + Dockerfile de runtime + compose em bridge + Caddy snippet. | Funciona, mas sem auth, sem tema, sem shell. | **Seguido à mão** (mesmo molde) porque o destino é `engops/`, não `<dominio>/`. |
| Deploy | Build standalone local → `standalone.tgz` → imagem de runtime no Hetzner. Servidor `apps-noclient` (204.168.249.111) recebe o que não é de cliente; Postgres 18 do host em `172.17.0.1`. | Padrão validado em lojas, app e CRM. | **Igual.** `deploy/empacotar.sh` + `deploy/subir.sh`, porta 3130, banco `engops`. |
| Cobrança | Mercado Pago só; `packages/checkout`. | Em produção. | Fora do escopo desta fase. |

## 3. Lacunas encontradas

1. **Não há claim de empresa no SSO.** Cada app resolve empresa por e-mail. O EngOps faz igual (`Membro.email`).
2. **Não há pacote compartilhado de documentos, auditoria, fila ou notificações.** Cada app tem o seu. O EngOps nasce com esses módulos isolados em `src/lib` e `src/automation/core` para poderem sair como package depois.
3. **Portal do Cliente e Planner não existem.** O plano os cita como capacidades a reutilizar; hoje são eventos na outbox.
4. **Nenhuma informação técnica sobre SIMIL, RAE e SIOPI foi levantada ainda** (telas, campos, regras, existência de API). O adapter SIMIL carrega a melhor leitura de um formulário de avaliação e será conferido campo a campo em modo sombra.
5. **GitHub Actions da organização está bloqueado.** Deploy é manual pelo script, como nos outros projetos.

## 4. Riscos

| Risco | Mitigação adotada |
|---|---|
| Tela do SIMIL/SIOPI mudar e quebrar o robô | Não há robô. Modo sombra por padrão; driver real só em `src/automation/adapters/`, atrás de `ModoAutomacao.REAL` por empresa e de healthcheck. |
| Job executar duas vezes (clique duplo, worker morto) | `chaveIdempotencia` única + lease de 90 s + retomada da etapa em que parou. |
| Vazamento entre empresas | Todo serviço recebe `empresaId` da sessão e filtra; o motor recusa job cuja demanda é de outra empresa (`TENANT_MISMATCH`). |
| Dado inventado na tela | `scripts/verificar-dados-falsos.mjs` no `npm run conferir`. |
| Segredo em log | Timeline registra mensagens e dados de negócio; credencial nunca entra em `contexto`. |
| Servidor sem RAM | apps-noclient tinha 2,5 GB disponíveis em 11/09; processador de jobs roda no mesmo processo (sem Redis, sem segundo container). |

## 5. Informações que ainda precisam ser obtidas

- SIMIL: URL, autenticação (certificado? usuário/senha? MFA?), lista exata de campos por tipo de serviço, o que é "concluído" (protocolo? PDF?).
- RAE: modelo oficial, campos, cálculos, formato de saída exigido.
- SIOPI: fluxo de telas, autenticação, evidência de conclusão, tempo médio.
- Existe API oficial ou convênio para qualquer um dos três? Sem isso, o driver real é RPA com Playwright, e a Caixa precisa autorizar o uso automatizado.
