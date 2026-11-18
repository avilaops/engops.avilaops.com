# Central GOV global • plano de execução

Objetivo aprovado: executar todas as pendências da central, incluindo busca global, coleta contínua, atualização de salvos, alertas e análise consolidada. Não considerar login real gov.br concluído sem as credenciais oficiais.

## Arquitetura e cobertura

Catálogo público global em PostgreSQL, deduplicado pela identificação PNCP entre provedores. Históricos legados mantêm identidade própria quando não existe identificação PNCP comprovada. Salvos e regras de alerta continuam isolados por empresa. Filtros, contagens e gráficos usam o conjunto completo indexado, não uma página da API.

Coleta com cursores persistentes, reserva com vencimento, transação por página, limites de requisição e retentativas com backoff. Priorizar oportunidades recentes e abertas enquanto a carga histórica percorre todo o período suportado desde a criação das bases. Não apresentar cobertura em formação como histórico completo. Alterações e prazos dos salvos geram notificações internas deduplicadas; buscas salvas notificam novas publicações compatíveis. Não enviar emails ou mensagens externas sem solicitação.

As tabelas do catálogo e seus índices precisam de espaço fora da raiz do servidor, que tem menos de 2 GB livres. Preparar tablespace no volume existente, conferir espaço e monitorar carga. Não mover tabelas dos outros módulos.

Datas, valores ausentes, categoria não fornecida e proveniência permanecem explícitos. Não somar planejamentos e contratações como se fossem despesas independentes. Agrupamentos mostram os dados disponíveis, sem inventar classificação.

Correção do usuário: as capturas de Poder/Esfera eram uma pergunta sobre preenchimento de formulário de credenciamento, não um pedido de novos filtros. Retirada essa atribuição de escopo; os atributos poderão ser preservados da fonte para análise, sem apresentar a captura como requisito de interface aprovado.

## Entregas e verificações

- [x] Migração 0006: catálogo, cursores de coleta, regras e entregas de alertas; índices de busca textual e filtros. Verificar migração em PostgreSQL isolado e isolamento por tenant.
- [x] Motor de coleta e conciliação: testes de retomada, lease vencida, idempotência, deduplicação, registro desatualizado e falha parcial. Atualização recorrente e cobertura verificável por origem/período.
- [ ] Conclusão da carga histórica inicial • processamento em segundo plano, com cobertura parcial explícita.
- [x] Busca SQL global, paginação e consolidação com os mesmos filtros; testes de busca além da primeira página, valores desconhecidos, etapas e igualdade entre contagens e agrupamentos.
- [x] Salvos atualizados, alertas de alteração/prazo e regras pessoais por empresa; testes de duplicação, autorização e inexistência de vazamento entre empresas.
- [x] Tela global, filtros, análise, regras e situação da coleta; manter consulta direta como ferramenta adicional, sem filtros locais sendo chamados globais.
- [x] Conferir Auth gov.br e caminho de credenciamento oficial. Não inventar Client ID/Secret nem simular login como autenticação real.
- [ ] Credenciamento e login real gov.br • dependência externa de elegibilidade e autorização oficial.
- [x] Testes, build, revisão, backup, tablespace, migração e publicação; conferir UI, banco e worker. Alertas validados em PostgreSQL isolado, sem fabricar alteração de edital em produção. Manter objetivo aberto enquanto houver dependência necessária pendente.

## Estado inicial

Base 7e4c389, com evidências a04ffd0 preservadas. Produção possui somente consultas diretas e salvos. Volume existente tem aproximadamente 16 GB livres; raiz aproximadamente 1,8 GB. Leitura inicial confirmou banco engops com cerca de 9 MB. Segredos nunca devem aparecer em saída ou arquivos versionados.

## Evidências durante implementação

• Migração deploy e diff aprovados em banco isolado, incluindo índice GIN funcional. Sete testes PostgreSQL reais aprovados: busca fora da página inicial, deduplicação, somas, salvos/notas, alerta único, isolamento, dado antigo, lease, retomada após 503, rollback de página parcialmente inválida e reutilização de salvo Compras após preferência PNCP.
• Build local aprovado com as novas rotas `/gov` e `/gov/fontes`. Verificações unitárias anteriores: 151 testes aprovados; testes PostgreSQL são obrigatórios no CI com serviço isolado, não mascarados pela ausência de banco.
• Manual PNCP 2.6 consultado: incluir modalidade 14 e aceitar CNPJ alfanumérico para não interromper a carga. Fontes oficiais: https://pncp.gov.br/manual/pt-br/latest/singlehtml/ e https://pncp.gov.br/manual/pt-br/latest/singlehtml/index.html.
• Credenciamento gov.br: o formulário enviado pelo usuário é SGD Integrar Produtos ID. As regras oficiais não demonstram elegibilidade da Ávila Ops comercial para integração. Não orientar seleção fictícia de Poder/Esfera. O conector permanece condicionado à autorização oficial; as consultas públicas e o SSO Ávila Ops continuam independentes.
• Publicação 1b27751 com pipeline 43693041282 aprovado. Migração 0006, tablespace e onze índices conferidos; oito fluxos habilitados. Navegador aprovou busca global, gráficos, preservação de notas, isolamento e layout móvel. Carga inicial em andamento.
• Operação revelou HTTP 400 por tamanho de página PNCP: lotes 500 e PCA 5 rejeitados; 50 e 10 aceitos em chamadas reais. Adaptador corrigido para limites específicos do provedor, com teste de regressão. Script de tablespace corrigido para nomes de índices com maiúsculas; reaplicação idempotente aprovada.
• Correção publicada em ef457a1 pelo pipeline 43694074586. CI aprovou 159 testes, sete deles PostgreSQL. Navegador repetido em 2026-11-15T08:26:09Z aprovado. Os oito fluxos têm páginas bem-sucedidas e falhas zeradas; 13.880 registros indexados na conferência seguinte. Isso não representa cobertura nacional completa.
• API PCA informou início mínimo 2021-04-01 em resposta HTTP 422. Ajustado o início somente desse fluxo, antes de qualquer página histórica bem-sucedida. Primeira janela abril/2021 concluída sem erro. Configuração de novas instalações atualizada.
• Auditoria posterior identificou que a conferência individual de salvo PCA retornava null sem consultar a fonte, ficando dependente da varredura nacional. Corrigida para consulta por órgão, com paginação e janelas anuais válidas; três testes de regressão cobrem item fora da primeira página, falha HTTP e ausência após percorrer as janelas. Execução somente de leitura em 2026-11-15T08:43:09Z localizou o item real 01313237000195-0-000001/2023#1, valor 105600 e atualização de fonte 2023-02-17T09:57:31. Publicação dessa correção ainda pendente.
• Usuário confirmou que se trata de plataforma comercial própria, sem órgão público parceiro. Não existe enquadramento demonstrado no formulário público de credenciamento. Login gov.br permanece condicionado a autorização oficial compatível com esse uso; acesso Ávila e APIs públicas permanecem o caminho operacional.
• Diagnóstico de PCA histórico em 2023-04-21 até 2023-05-20: timeout recorrente de 30s e consulta de leitura ampliada retornando HTTP 500 após 58,398s. O mesmo início limitado a 2023-04-21 respondeu HTTP 204 em 6,759s. Alteração para janelas históricas diárias de PCA, preservando a janela mensal de cursores já paginados até seu término. Testes cobrem persistência de tamanho e transição sem omissão; a cobertura histórica integral permanece como objetivo.
• Correção posterior desse diagnóstico em 16/11/2026: HTTP 204 com início e fim iguais não comprovava ausência de itens. A API PCA limita a data final à meia-noite. Consulta real do órgão 02042388000119 com 20221231 até 20221231 retornou 204; 20221231 até 20230101 retornou 200, 37 itens e quatro páginas, incluindo item atualizado às 23:36:27 de 31/12. O adaptador precisa enviar o dia seguinte ao fim lógico, inclusive nas janelas anuais de conferência de salvos. Testes adicionados para o dia completo, virada do ano, bissexto, limite de período e unidade de contagem por item. PCA histórico e recente pausados, cobertura retirada; reprocessamento integral previsto por script guardado. As seis outras coletas permanecem ativas.
• A mesma auditoria identificou o limite de meia-noite no Compras moderno: consulta 13/11/2026 até 13/11/2026 retornou zero; até 14/11 retornou 505 publicações de 13/11. Histórico e recente de Compras também pausados, com cobertura retirada para reprocessamento completo. Legado em 12/07/2024 retornou um registro com data à meia-noite usando o mesmo dia como fim; PNCP publicação em 13/11 retornou 2.025 registros, incluindo 00:00:06. Esses dois adaptadores mantêm seus limites. A verificação do PCA corrigido percorreu as quatro páginas reais e recuperou 37 IDs únicos, sem gravações. Os quatro fluxos PNCP/legado continuam ativos durante a correção.
• Correção do limite final publicada em 49bffc4 pelo pipeline 43872581344, com 180 testes aprovados. Backup dos quatro cursores conferido; script retomou PCA e Compras desde seus inícios originais e revisões de sete dias. Compras recente recebeu 986 registros nas primeiras consultas corrigidas. PCA nacional recente apresentou HTTP 500 após 53,125s em diagnóstico de leitura; não foi tratado como vazio.
• Verificador de navegador passou pelas consultas corrigidas, mas a análise consolidada excedeu 60s com mais de 1,5 milhão de registros. EXPLAIN confirmou ordenação completa para a primeira página e varreduras separadas por dimensão. SQL com GROUPING SETS e memória local de 16MB terminou em 16,029s sobre aproximadamente 1,546 milhão de registros, sem arquivos temporários. Preparação de dois índices concorrentes, migração 0007 e consulta única em validação. Não considerar verificação de navegador global concluída enquanto a repetição não passar.
