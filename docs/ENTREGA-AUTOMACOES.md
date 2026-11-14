# Incremento de automações

Implementação local; publicação e validação autenticada em produção pendentes.

## Disponível no código

- Central `/automacoes` com situação explícita de SIMIL, RAE, SIOPI e Banco do Brasil.
- Preparação em lote de até 50 demandas prontas: seleção, prévia com aptas e bloqueadas, confirmação explícita, nova validação, retorno individual e reaproveitamento do pedido existente. Alterar a seleção descarta a prévia anterior. A conferência recalcula pendências e checklist, mas não cria jobs. O modo real é bloqueado quando o healthcheck do SIMIL falha.
- Processamento manual restrito aos jobs da empresa da sessão. O worker de serviço mantém a seleção global. O filtro da empresa é aplicado na própria consulta que reserva o job, preservando o lock da fila.
- CSV de demandas da empresa selecionada, com permissão `relatorio.ver`, auditoria, proteção contra fórmulas e limite de 10.000 registros. Acima do limite, a exportação é recusada, sem truncamento silencioso. Exporta todas as demandas da empresa, sem aplicar os filtros da tela.
- Alertas internos de atrasos, aprovações e execuções com erro, recalculados ao carregar a central.
- Caixa de entrada persistente em `/notificacoes`, acessível pelo menu do desktop e por Mais no celular. Filtro de não lidas/todas, paginação de 30 itens e leitura individual com escopo de empresa e destinatário.
- Novos eventos `AprovacaoSolicitada` geram avisos para membros ativos com permissão de aprovar; `AutomacaoFalhou`, para membros ativos com permissão de executar. Emails são normalizados e deduplicados. Evento e avisos são gravados na mesma transação. A tabela já existia; não há migração neste incremento.
- Não há reprocessamento dos eventos antigos, push nem envio de mensagens externas. Donos da plataforma sem vínculo de membro não recebem avisos automaticamente.

## Dependências ainda abertas

- SIMIL real: contrato de API ou fluxo autorizado do portal, autenticação e exemplo de confirmação de envio. O driver continua indisponível.
- RAE: modelo oficial, dados obrigatórios e regras de cálculo. Nenhum relatório é apresentado como RAE oficial sem essas definições.
- SIOPI: completar o [inventário funcional](SIOPI-FUNCIONALIDADES.md) iniciado com as capturas da página inicial e do menu; levantar autenticação, operações autorizadas e comprovante de sucesso. As APIs do SIOP federal enviadas como referência pertencem a outro sistema.
- Banco do Brasil: identificar portal e operação.
- Notificações: definir destinatários, canais e gatilhos para entregas externas; agenda de alertas de prazo e atualização em tempo real ainda não implementadas.
- Exportação XLSX/PDF e dossiê ZIP ainda não implementadas.

## Validação

`npm run conferir`: tipos, lint, verificação de dados fictícios e testes automatizados.
Os testes de serviços usam mocks; não substituem o piloto com PostgreSQL, sessão autenticada e portais reais.
