# Roadmap

Estado em 06/11/2026. ✓ feito, ◐ parcial, ○ não iniciado.

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

## ART Múltipla CREA-SP ◐

- Primeira entrega: em `/automacoes/art`, carregar até 50 demandas da empresa pelo código EngOps e conferir um lote CAIXA por competência, contrato, responsável técnico e atividades comuns. As datas da atividade e a remuneração por OS são informadas na conferência. A prévia é temporária.
- Vínculo da ART registrada: escolher um PDF já anexado como ART em uma das OS, confirmar a relação de serviços e registrar o vínculo auditado. O PDF fica acessível pela ficha de cada OS vinculada.
- O vínculo grava `ArtMultiplaVinculada` na outbox para o n8n na mesma transação. O evento carrega apenas os IDs da ART e das demandas. O consumidor deve filtrar pelo nome do evento e deduplicar pelo ID do envelope.
- Próxima entrega: validar o leiaute TXT no CreaOne com um arquivo de referência e persistir a preparação dos lotes.

## Fase 6: RAE ○

- Gerador a partir dos dados validados, regras que bloqueiam erro previsível, prévia, versão final em PDF no dossiê (pasta 06-RAE), `ExecucaoExterna(RAE)`.
- Dependência: modelo oficial do RAE e regras de cálculo.

## Fase 7: SIOPI ○

- Módulo com preparação, autenticação, navegação, execução, captura de retorno, validação de sucesso real, evidência.
- Levantamento iniciado em 14/11/2026: [inventário funcional do SIOPI](SIOPI-FUNCIONALIDADES.md), com menu, contexto de unidade, três buscas e 14 atalhos observados nas capturas. Telas internas e regras ainda pendentes; o conector real permanece não implementado.
- Dependência: fluxo do SIOPI documentado; decisão sobre RPA.

## Fase 8: lotes ◐

- Implementado localmente: seleção de até 50 demandas prontas, revalidação antes de enfileirar, resultado por demanda e bloqueio por healthcheck no modo real.
- Implementado localmente: prévia consolidada antes da confirmação, revalidação na confirmação e processamento manual restrito à empresa da sessão.
- Falta: publicação e validação autenticada em produção. Ver [entrega de automações](ENTREGA-AUTOMACOES.md).

## Fase 9: dashboards e notificações ◐

- Feito parcialmente: `/relatorios` com indicadores e funil contados no banco.
- Implementado localmente: exportação CSV autenticada e auditada, alertas de atrasos/aprovações/erros ao carregar a central.
- Implementado localmente: notificações persistentes de aprovação e falha de automação, leitura individual, filtro e paginação em `/notificacoes`.
- Falta: exportação XLSX/PDF, tempo economizado, `PrazoEmRisco` agendado, mensagens por n8n; publicação e validação do incremento local.

## Fase 10: IA ○

- Copiloto com tools estruturadas sobre `src/servicos` usando `@avila-ops/ai-core`. Sem acesso direto ao banco.

## Fase 11: hardening ○

- Rate limiting, CSRF nas rotas de API, políticas de retenção, testes E2E com Playwright, ambiente de simulação (fixtures de SIMIL sucesso, campo alterado, SIOPI timeout, sessão expirada, RAE inválido, documento ausente, divergente), feature flags além do modo sombra.

## Fase 12: operação de serviços da Silveira Cruz ○

Objetivo: usar a base do EngOps para controlar os serviços de engenharia prestados a Caixa, SESI, FNDE e outros contratantes, mantendo fluxos e documentos específicos por tipo de serviço.

- Mapear com a equipe o processo real de cada contratante: etapas da OS, dados exigidos, prazos, critérios de conclusão e responsáveis.
- Receber e revisar os materiais do SESI mencionados pelo Wiliam (planilha, informações solicitadas e recomendações); converter os requisitos confirmados em campos, validações, checklist e modelos de relatório.
- Confirmar os requisitos do FNDE com exemplos reais de vistoria, fotos, registros e entrega. Validar a sigla e o nome do sistema citados na transcrição antes de codificar.
- Definir um catálogo de tipos de serviço e seus fluxos sem misturar as regras próprias de Caixa, SESI e FNDE.
- Completar o cadastro do cliente/contratante e relacioná-lo à OS, ao programa/contrato, à unidade atendida e ao contato, conforme os dados que cada operação realmente exigir.
- Definir a ficha da OS/vistoria: número externo, serviço, local, datas, prazo de atendimento e conclusão, responsável gerencial, executor/estagiário, prioridade, situação e histórico de alterações.
- Permitir atribuir uma demanda a um integrante da equipe e manter visão gerencial das demandas, prazos, responsáveis e pendências.
- Definir checklists e documentos obrigatórios por tipo de serviço; registrar vistorias, recomendações, fotos e anexos no dossiê da OS com autoria e data.
- Implementar geração e conferência dos relatórios exigidos por cada contratante, com exportação no formato acordado e vínculo da versão entregue ao dossiê.
- Validar permissões para equipe gerencial, operadores/estagiários, revisores e consulta; restringir ações e dados segundo o papel já existente.
- Adicionar filtros e indicadores para contratante, tipo de serviço, situação, responsável e prazo; destacar prazos em risco e vencidos.
- Integrar notificações e eventos ao n8n somente após definir destinatários, gatilhos e conteúdo, sem enviar comunicações externas sem validação.
- Fazer piloto com OS reais de cada fluxo, conferir campos/documentos/relatórios com a equipe e ajustar antes de ativar automações externas.
- Critério de aceite: uma OS de cada fluxo piloto pode ser cadastrada, atribuída, acompanhada, documentada, revisada e concluída com prazo e evidências consultáveis; relatório e auditoria correspondem ao processo aprovado.
- Dependências: materiais e exemplos reais do SESI e FNDE; confirmação do fluxo atual de Caixa; validação dos campos, modelos e papéis por Wiliam e equipe.

## Primeiro incremento vertical de produção

A fundação e o fluxo Caixa/SIMIL em modo sombra estão implementados conforme descrito acima. Antes de considerar o EngOps pronto para a operação ampliada da Silveira Cruz, concluir ao menos um piloto de cada fluxo da Fase 12: criar OS → atribuir responsável → registrar vistoria e documentos → resolver pendências → revisar relatório → concluir e consultar auditoria.

## Pendências para o próximo deploy ○

O deploy será executado pelo responsável do projeto. Antes e depois da publicação:

- [ ] Confirmar quais fases e fluxos entram neste deploy; a Fase 12 ainda é roadmap, não funcionalidade pronta.
- [ ] Conferir no servidor as variáveis obrigatórias do `.env.example`, incluindo banco, segredo SSO e configuração de storage; não registrar valores secretos no repositório.
- [ ] Confirmar conectividade com PostgreSQL 18, SSO e R2 (ou fallback local previsto para desenvolvimento).
- [ ] Fazer backup do banco antes de aplicar migrações e conferir se existe procedimento de restauração.
- [ ] Executar `npm run conferir` no commit que será publicado e corrigir falhas antes do deploy.
- [ ] Revisar as migrações pendentes e aplicar `npm run prisma:migrate` no ambiente de produção conforme a rotina do deploy.
- [ ] Seguir `bash deploy/subir.sh`; conferir serviço, porta 3130, proxy Caddy e configuração de worker, se o worker for ativado.
- [ ] Validar após a publicação: healthcheck, login SSO, seleção de empresa, permissões, criação/consulta de demanda, upload e download de documento, prazos, relatórios e auditoria.
- [ ] Se qualquer verificação falhar, interromper a ativação operacional e seguir o procedimento de rollback; registrar o resultado e o commit publicado.
- [ ] Registrar evidência, ambiente e resultado do deploy sem incluir credenciais.

## Métricas a acompanhar desde já

Tempo entrada→entrega, % de demandas com pendência antes da preparação, execuções em sombra confirmadas × recusadas (é a taxa de acerto do mapa de campos), jobs FAILED por código, OS concluídas no prazo por contratante e tipo de serviço.
