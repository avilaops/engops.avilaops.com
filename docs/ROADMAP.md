# Roadmap

Estado em 11/09/2026. ✓ feito, ◐ parcial, ○ não iniciado.

## Fase 0: investigação ✓

- Objetivo: saber o que o ecossistema tem e o que o plano supõe que existe.
- Entrega: [AUDITORIA-INICIAL.md](AUDITORIA-INICIAL.md), [ECOSSISTEMA-AVILA-OPS.md](ECOSSISTEMA-AVILA-OPS.md).
- Critério de aceite: cada capacidade citada no plano tem estado real e decisão.

## Fase 1: fundação ✓

- Empresa, membro, RBAC por ação, sessão via login único, escolha de empresa.
- Fila de jobs em Postgres com idempotência, lease, retry, pausa e retomada.
- Auditoria e outbox de eventos.
- Storage R2 com fallback local, hash, versão.
- Design system (tokens do app, padrão iOS), `AppShell`, `Sheet`, paleta Ctrl+K.
- Portão `npm run conferir` (typecheck, lint, dados falsos, testes).
- Dependências: nenhuma. Riscos: nenhum aberto.
- Evidência: telas `/empresas`, `/equipe`, `/empresa`, `/auditoria`; testes de fila e RBAC.

## Fase 2: central de demandas ✓

- Criar, editar, listar com busca global, filtros por estado/prazo/responsável, tabela e Kanban, prazos, mudança de estado só por transição permitida.
- Evidência: `/demandas`, `/demandas/nova`, `/demandas/[id]`, `/prazos`.
- Falta (Fase 2.1): filtros salvos com nome, favoritos, calendário.

## Fase 3: documentos ◐

- Feito: dossiê por pasta, upload com tipo sugerido pelo nome, nome padronizado, hash e deduplicação, versão, remoção auditada, download por URL assinada, conferência de campos por documento.
- Falta: importação por PDF/planilha/ZIP em lote (extrair OS de PDF), ZIP do dossiê completo, preview no navegador, detecção de arquivo provavelmente errado.
- Dependência: exemplo real de OS em PDF para calibrar a extração.

## Fase 4: validação ✓

- Detector de pendências (cadastro, CPF/CNPJ, documentos obrigatórios), validador cruzado (cadastro × conferência do documento), checklist calculado, próxima ação, pendência manual, aprovação humana.
- Evidência: `/pendencias`, `/aprovacoes`, painel na demanda; testes em `tests/unit/validacao.test.ts` e `checklist.test.ts`.

## Fase 5: SIMIL ◐

- Feito: workflow `preparar-simil` completo em modo sombra (prepara, valida, mapeia 16 campos, prévia, aprovação, confirmação com protocolo, evidência), erro tipado, timeline.
- Falta: conferir o mapa de campos contra o SIMIL real (primeira demanda de verdade), driver real (após decisão sobre API oficial ou RPA autorizado), healthcheck que bloqueia lote.
- Critério para sair da sombra: N execuções confirmadas sem "não bateu" (N a definir por empresa, sugestão 30).

## Fase 6: RAE ○

- Gerador a partir dos dados validados, regras que bloqueiam erro previsível, prévia, versão final em PDF no dossiê (pasta 06-RAE), `ExecucaoExterna(RAE)`.
- Dependência: modelo oficial do RAE e regras de cálculo.

## Fase 7: SIOPI ○

- Módulo com preparação, autenticação, navegação, execução, captura de retorno, validação de sucesso real, evidência.
- Dependência: fluxo do SIOPI documentado; decisão sobre RPA.

## Fase 8: lotes ○

- Seleção múltipla, pré-checagem ("37 selecionadas, 34 prontas, 3 com pendência"), enfileirar só as prontas, bloqueio por healthcheck.

## Fase 9: dashboards e notificações ○

- Feito parcialmente: `/relatorios` com indicadores e funil contados no banco.
- Falta: exportação CSV/XLSX/PDF, tempo economizado, notificações in-app, `PrazoEmRisco` agendado, mensagens por n8n.

## Fase 10: IA ○

- Copiloto com tools estruturadas sobre `src/servicos` usando `@avila-ops/ai-core`. Sem acesso direto ao banco.

## Fase 11: hardening ○

- Rate limiting, CSRF nas rotas de API, políticas de retenção, testes E2E com Playwright, ambiente de simulação (fixtures de SIMIL sucesso, campo alterado, SIOPI timeout, sessão expirada, RAE inválido, documento ausente, divergente), feature flags além do modo sombra.

## Primeiro incremento vertical de produção

Uma empresa real (a primeira cliente ou a própria Ávila Ops com uma demanda de
teste) faz: criar demanda → enviar OS e matrícula → conferir a matrícula →
resolver as pendências → preparar SIMIL em sombra → executar à mão comparando
com a tela → confirmar → ver a auditoria. É o que este build entrega.

## Métricas a acompanhar desde já

Tempo entrada→entrega, % de demandas com pendência antes da preparação,
execuções em sombra confirmadas × recusadas (é a taxa de acerto do mapa de
campos), jobs FAILED por código.
