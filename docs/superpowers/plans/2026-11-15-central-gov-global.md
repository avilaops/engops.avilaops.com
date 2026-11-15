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
- [ ] Motor de coleta e conciliação: testes de retomada, lease vencida, idempotência, deduplicação, registro desatualizado e falha parcial. Importação histórica integral e atualização recorrente; cobertura verificável por origem/período.
- [x] Busca SQL global, paginação e consolidação com os mesmos filtros; testes de busca além da primeira página, valores desconhecidos, etapas e igualdade entre contagens e agrupamentos.
- [ ] Salvos atualizados, alertas de alteração/prazo e regras pessoais por empresa; testes de duplicação, autorização e inexistência de vazamento entre empresas.
- [ ] Tela global, filtros, análise, regras e situação da coleta; manter consulta direta como ferramenta adicional, sem filtros locais sendo chamados globais.
- [ ] Conferir Auth gov.br e caminho de credenciamento oficial. Não inventar Client ID/Secret nem simular login como autenticação real.
- [ ] Testes, build, revisão, backup, tablespace, migração e publicação; conferir UI, banco, worker e alertas reais. Manter objetivo aberto enquanto houver trabalho ou dependência necessária pendente.

## Estado inicial

Base 7e4c389, com evidências a04ffd0 preservadas. Produção possui somente consultas diretas e salvos. Volume existente tem aproximadamente 16 GB livres; raiz aproximadamente 1,8 GB. Leitura inicial confirmou banco engops com cerca de 9 MB. Segredos nunca devem aparecer em saída ou arquivos versionados.

## Evidências durante implementação

• Migração deploy e diff aprovados em banco isolado, incluindo índice GIN funcional. Sete testes PostgreSQL reais aprovados: busca fora da página inicial, deduplicação, somas, salvos/notas, alerta único, isolamento, dado antigo, lease, retomada após 503, rollback de página parcialmente inválida e reutilização de salvo Compras após preferência PNCP.
• Build local aprovado com as novas rotas `/gov` e `/gov/fontes`. Verificações unitárias anteriores: 151 testes aprovados; testes PostgreSQL são obrigatórios no CI com serviço isolado, não mascarados pela ausência de banco.
• Manual PNCP 2.6 consultado: incluir modalidade 14 e aceitar CNPJ alfanumérico para não interromper a carga. Fontes oficiais: https://pncp.gov.br/manual/pt-br/latest/singlehtml/ e https://pncp.gov.br/manual/pt-br/latest/singlehtml/index.html.
• Credenciamento gov.br: o formulário enviado pelo usuário é SGD Integrar Produtos ID. As regras oficiais não demonstram elegibilidade da Ávila Ops comercial para integração. Não orientar seleção fictícia de Poder/Esfera. O conector permanece condicionado à autorização oficial; as consultas públicas e o SSO Ávila Ops continuam independentes.
• Publicação 1b27751 com pipeline 43693041282 aprovado. Migração 0006, tablespace e onze índices conferidos; oito fluxos habilitados. Navegador aprovou busca global, gráficos, preservação de notas, isolamento e layout móvel. Carga inicial em andamento.
• Operação revelou HTTP 400 por tamanho de página PNCP: lotes 500 e PCA 5 rejeitados; 50 e 10 aceitos em chamadas reais. Adaptador corrigido para limites específicos do provedor, com teste de regressão. Script de tablespace corrigido para nomes de índices com maiúsculas; reaplicação idempotente aprovada.
