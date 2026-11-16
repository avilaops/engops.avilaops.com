# Integrações • telas do EngOps

**Objetivo:** disponibilizar as telas pendentes solicitadas pelo usuário, com persistência, permissões e estados reais.

**Arquitetura:** páginas Next.js usam os serviços SIOP existentes e ações autenticadas no servidor. RAE, SIOPI e Banco do Brasil compartilham configuração por empresa e registro manual com comprovante do dossiê em `ExecucaoExterna`. Não executar portais ou produzir um RAE oficial sem os contratos e modelos ausentes.

**Decisões:** execução local nesta sessão, isolada das alterações GOV em andamento. Reaproveitar as classes visuais e o RBAC atuais. As telas de operações registram trabalho realizado fora do EngOps; não alteram automaticamente o status da demanda. Não armazenar senhas nos formulários de configuração. Não buscar URLs de portais no servidor.

**Dependências externas:** credencial específica SIOP ainda indisponível; URL/fluxo oficial SIOPI, modelo e cálculos RAE, portal e operação BB solicitados ao usuário. Esses itens não impedem a interface, o histórico e os registros manuais, mas impedem declarar automação externa concluída.

## Plano e verificação

- [x] SIOP • configuração por ambiente, RBAC, consulta por exercício, histórico paginado, detalhe paginado com os 40 campos e valores exatos.
- [x] Operações • configuração por empresa, consulta de demandas, dossiê, registro manual com documento e protocolo, histórico paginado e idempotência.
- [x] Navegação • quatro acessos pela central, próxima ação da demanda, estados vazios e mensagens acessíveis, desktop e celular.
- [x] Qualidade local • tipos/lint/proteção contra dados fictícios e 181 testes aprovados; dez testes em banco isolado e navegador local aprovados. Build será conferido no CI antes do merge automático.
- [ ] Publicação • revisão, PR, CI, implantação e navegador de produção. Atualizar evidências e pendências reais.

## Pontos de revisão

- A empresa é sempre resolvida pela sessão; os formulários não escolhem o tenant.
- Referência de senha SIOP e disponibilidade nunca expõem o segredo; consultas desabilitadas enquanto não prontas.
- Somente o dono da plataforma define/troca a referência protegida SIOP. A comparação é transacional, anterior à leitura do segredo; administradores mantêm a referência já associada à empresa/ambiente.
- Erros de validação não ecoam payloads, senhas ou falhas internas.
- Documento precisa estar ativo e pertencer à demanda e à empresa; duplicatas não criam duas execuções.
- URLs externas são HTTPS sem credenciais, parâmetros ou fragmento; abertura pelo navegador com proteção de referência.
- Registro manual não habilita conector nem muda a etapa da demanda. Evidências removidas são identificadas no histórico.

## Evidências

Em implementação • base `49bffc4` • branch `feat/integracoes-ui-20261116`.

- 179 testes unitários aprovados na primeira conferência; os testes de banco não foram executados nessa chamada sem conexão.
- Migração 0008 aplicada em PostgreSQL isolado, sem diferença entre banco e schema. Nove testes de integrações aprovados em 16/11/2026, incluindo isolamento, documento inválido, duplicação concorrente, rollback e paginação completa.
- Revisão independente identificou checklist antigo no primeiro acesso: corrigido renderizando o resultado da validação atual.
- Revisão confirmou falha anterior de vinculação arbitrária de senhaEnvRef por administrador: corrigida e coberta por regressão, banco e navegador. Revisão final sem problemas críticos/importantes.
- Navegador isolado aprovado em 16/11/2026 às 14:32:55Z: configuração persistida, 40 campos, centavos exatos, registro manual, checklist imediato, referência protegida exclusiva do dono, perfil de consulta e isolamento entre empresas. Evidências locais em `reports/integracoes`.
