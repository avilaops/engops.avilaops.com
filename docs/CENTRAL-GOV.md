# Central GOV • operação

Abra `/gov` após selecionar uma empresa. Ávila Ops usa CNPJ 67.954.417/0001-64. Não há restrição por CNAE ou ramo.

• Propostas abertas: PNCP, todas as modalidades por padrão; filtros remotos por UF, CNPJ do órgão, modalidade e encerramento.
• Editais publicados: PNCP, período e modalidade explícitos; não implica prazo aberto.
• Planejamento anual: PCA atualizado no período, com itens individuais; paginação por planos, data desejada e ano preservados.
• Pregões Compras.gov.br: contratações da Lei 14.133, código SIASG 5, com filtros remotos por período, UF, órgão e objeto. Código PNCP 6 não pode ser usado diretamente como código SIASG.
• Legado: arquivo de pregões anteriores. Há dados reais confirmados em 2022; períodos recentes podem retornar vazios.
• Salvas: retrato, notas e situação da análise por empresa. Até 500 salvas mais recentes; não é sincronização automática do edital.

Texto, nome do órgão e valores filtram a página carregada, salvo objeto na aba Compras.gov.br, que também vai à fonte. A contagem externa nunca é apresentada como contagem de itens que passaram nos filtros locais. Para cruzamentos nacionais completos, será necessária ingestão e indexação de toda a base, fora desta primeira entrega aprovada. A mesma contratação pode aparecer em fontes diferentes.

Papéis que podem editar demandas podem salvar/analisar oportunidades. Consulta e revisor apenas leem. Toda gravação e consulta de salvos usa empresa da sessão. Falhas externas aparecem como falhas, não como resultado vazio. Links são oficiais e conteúdo externo é renderizado como texto.

Login é centralizado em `auth.avilaops.com`. O provedor gov.br é configurado no Auth, nunca no EngOps; as APIs públicas não dependem dele.

## Publicação e verificação

Pipeline `.github/workflows/deploy-production.yml` publica no servidor `applications`, container `engops-avilaops-com-web`. O despachante ativo aplica migrações e faz backup do banco `engops` antes de migração pendente. Não usar o script manual antigo como descrição da stack atual.

Migração: `0005_central_gov`. Provisionamento idempotente: `node scripts/provisionar-avila-ops.mjs` com DATABASE_URL do destino. Cria vínculo ADMIN para o proprietário já configurado, sem senha ou convite.

`npm run conferir` valida tipos, lint, dados falsos e testes. `npm run build` valida produção. `npx tsx scripts/verificar-gov.ts` executa consultas reais com períodos de referência explícitos; é uma verificação manual das fontes, não um teste unitário dependente da rede.
