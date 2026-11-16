# Central GOV • operação

Abra `/gov` após selecionar uma empresa. Ávila Ops usa CNPJ 67.954.417/0001-64. Não há restrição por CNAE ou ramo.

• Propostas abertas: PNCP, todas as modalidades por padrão; filtros remotos por UF, CNPJ do órgão, modalidade e encerramento.
• Editais publicados: PNCP, período e modalidade explícitos; não implica prazo aberto.
• Planejamento anual: PCA atualizado no período, com itens individuais; paginação por planos, data desejada e ano preservados.
• Pregões Compras.gov.br: contratações da Lei 14.133, código SIASG 5, com filtros remotos por período, UF, órgão e objeto. Código PNCP 6 não pode ser usado diretamente como código SIASG.
• Legado: arquivo de pregões anteriores. Há dados reais confirmados em 2022; períodos recentes podem retornar vazios.
• Salvas: retrato atualizado, notas e situação da análise por empresa, com paginação e notificações internas de alteração e prazo.

A busca principal em `/gov` consulta todo o catálogo PostgreSQL indexado. Filtros são aplicados antes das contagens, paginação e agrupamentos por órgão, região, categoria, modalidade e mês. Contratações PNCP são deduplicadas entre fontes. Planejamento e legado não são somados às contratações como despesas independentes. Categoria ausente não é inventada.

A carga histórica começa em formação. A aba Coleta informa períodos percorridos, última atualização, falhas e próxima tentativa. Ausência de resultados não comprova ausência de demanda nacional enquanto a cobertura estiver incompleta. A consulta direta permanece em `/gov/fontes`; nela, filtros locais e contagens externas têm indicação própria.

O worker executa duas reservas independentes, com lease, checkpoint persistente, transação por página e retentativa progressiva. Fluxos recentes e históricos cobrem PNCP, Compras, PCA e legado. Salvos são conferidos periodicamente sem alterar notas ou situação. Regras pessoais notificam novas publicações posteriores à criação da regra. Alertas são internos, deduplicados e isolados por empresa; não há envio externo.

Para planejamento salvo, a conferência individual pesquisa o órgão nas páginas da API PCA por janelas de até 365 dias, desde o período atual até o início permitido pela fonte em 01/04/2021. O item é identificado pelo controle PNCP completo e número, sem depender da posição na primeira página ou da conclusão do histórico nacional. Indisponibilidade preserva o retrato anterior e gera nova tentativa.

O histórico PCA usa janelas diárias: a consulta mensal de abril/maio de 2023 apresentou HTTP 500 na fonte enquanto a diária respondeu normalmente. Cursores mensais anteriores que já estejam na página 2 ou seguinte concluem o mesmo intervalo antes da mudança. O tamanho da janela fica no cursor, mantendo as páginas seguintes no mesmo período. Nenhum dia do histórico é descartado.

Papéis que podem editar demandas podem salvar/analisar oportunidades. Consulta e revisor apenas leem. Toda gravação e consulta de salvos usa empresa da sessão. Falhas externas aparecem como falhas, não como resultado vazio. Links são oficiais e conteúdo externo é renderizado como texto.

## Controle das coletas

Em `/gov?visao=coleta`, o dono da plataforma pode pausar ou retomar cada fluxo.
O catálogo é compartilhado por todas as empresas: os controles não são liberados
apenas pelo papel ADMIN de uma empresa. A autorização é conferida novamente no
serviço, sem depender da visibilidade dos botões.

A pausa impede novas reservas. Uma página já reservada pode terminar e gravar
seu resultado; nesse intervalo a tela informa que está pausando. Retomar agenda
a próxima tentativa para agora e continua do checkpoint salvo. Essas operações
preservam reservas, cursores, cobertura, contadores, dados e o último erro. O erro
só é limpo quando uma nova página é processada com sucesso.

Cada alteração efetiva grava a auditoria na mesma transação. Comandos repetidos
não duplicam o registro nem mudam o agendamento. O botão Atualizar situação
recarrega os estados sem fazer consulta adicional aos provedores. A pausa e a
retomada foram testadas com uma página em andamento em PostgreSQL isolado.

Login é centralizado em `auth.avilaops.com`. O provedor gov.br permanece desabilitado sem credenciamento oficial; as APIs públicas não dependem dele. O formulário SGD Integrar Produtos ID exige dados de órgão público. Não há Poder/Esfera comprovadamente aplicável à Ávila Ops comercial; não selecionar dados fictícios. É necessária análise de elegibilidade conforme o [termo oficial](https://www.gov.br/governodigital/pt-br/estrategias-e-governanca-digital/transformacao-digital/ferramentas/autenticacao-gov.br/termo-de-uso-do-servico-de-integracao-com-a-conta-gov.br), além de credenciais.

## Publicação e verificação

Pipeline `.github/workflows/deploy-production.yml` publica no servidor `applications`, container `engops-avilaops-com-web`. O despachante ativo aplica migrações e faz backup do banco `engops` antes de migração pendente. Não usar o script manual antigo como descrição da stack atual.

Migrações: `0005_central_gov` e `0006_gov_catalogo`. Provisionamento idempotente: `node scripts/provisionar-avila-ops.mjs` com DATABASE_URL do destino. Cria vínculo ADMIN para o proprietário já configurado, sem senha ou convite.

Coletas nascem desabilitadas. Após a migração, executar `deploy/gov-tablespace.sql` como administrador do banco `engops`, com diretório do volume previamente criado e pertencente ao PostgreSQL. O script move somente `gov_registros` e seus índices para `engops_gov`. O manifesto `deploy/compose.applications.yml` monta o diretório em `/app/gov-volume` para leitura de capacidade. O worker exige esse tablespace e pelo menos 2 GiB livres. Conferir ambos antes de habilitar `gov_coletas.habilitada`; não reiniciar cursores.

O CI exige testes em PostgreSQL 18. `node scripts/validar-gov-banco.mjs` valida migração, diff e comportamentos em banco remoto isolado, removido ao final.

`npm run conferir` valida tipos, lint, dados falsos e testes. `npm run build` valida produção. `npx tsx scripts/verificar-gov.ts` executa consultas reais com períodos de referência explícitos; é uma verificação manual das fontes, não um teste unitário dependente da rede.
