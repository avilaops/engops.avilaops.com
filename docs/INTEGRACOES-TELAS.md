# Integrações • telas e fontes oficiais

## Telas implementadas

- `/automacoes/siop`: ambiente, configuração protegida, consulta por exercício e histórico paginado.
- `/automacoes/siop/[id]`: estado, mensagens e todos os 40 campos do contrato, com centavos exatos e paginação de 100 registros.
- `/automacoes/operacao/rae`: fila, busca de OS, relatório anexado ao dossiê e registro manual auditado.
- `/automacoes/operacao/siopi`: parâmetros da empresa, fila, busca, protocolo e comprovante da operação manual.
- `/automacoes/operacao/banco-brasil`: portal e operação configurados pela empresa, vinculação de demandas, protocolo e comprovante.

As configurações pertencem à empresa da sessão. Administradores configuram; operadores autorizados registram; demais perfis consultam. No SIOP, somente o dono da plataforma define ou troca a referência protegida de credencial; o administrador da empresa mantém a referência previamente vinculada, sem selecionar segredos de outra empresa. Registros manuais não executam portais, não geram documentos oficiais e não avançam automaticamente a etapa da demanda.

## Fontes verificadas em 16/11/2026

| Sistema | Fonte | Cobertura e limite |
| --- | --- | --- |
| SIOP federal | [Manual WSExecucaoOrcamentaria](https://www1.siop.planejamento.gov.br/siopdoc/doku.php/webservices:manual-wsexecucaoorcamentaria) e [contrato de homologação](https://testews.siop.gov.br/services/WSExecucaoOrcamentaria?wsdl) | Credencial específica de webservice, consulta PAC e DTOs. O contrato versionado determina os nomes transmitidos, conforme [documentação da integração](SIOP-EXECUCAO-ORCAMENTARIA.md). |
| SIOPI CAIXA | [Inventário do EngOps](SIOPI-FUNCIONALIDADES.md) | Capturas fornecidas pelo usuário: menus, contexto, três buscas e 14 atalhos. Não comprova acesso, API, telas internas ou fluxo automático. |
| Habitação e RAE CAIXA | [Cartilha Habitação PF • construção, reforma, melhoria e conclusão](https://www.caixa.gov.br/Downloads/habitacao-documentos-gerais/cartilha-habitacao-PF-construcao-conclusao-reforma-ampliacao-de-unidades-habitacionais.pdf) | Explica acompanhamento e RAE em modalidades específicas. Não foi identificado nesta fonte um contrato de geração automática ou o modelo aplicável à empresa. |
| Engenharia Banco do Brasil | [GUIAR 2024/00940 • versão 02](https://www.bb.com.br/docs/portal/disec/GUIAR-202400940-VER02.pdf), especialmente itens 1 a 3 | Guia de credenciamento que remete aos modelos de laudo e ao MECI correspondente ao serviço. Distingue atividades pela plataforma e outras formas de atendimento. |
| Engenharia Banco do Brasil | [Downloads oficiais • Crédito Imobiliário BB](https://www.bb.com.br/site/compras-contratacao-e-venda-de-imoveis/compras-e-contratacoes/downloads/) | Local indicado pelo GUIAR para os manuais e modelos. O conteúdo dinâmico não foi integralmente acessível na consulta automatizada. |

Também foi localizada a [Cartilha SIOPI de pré-contratação do construtor](https://www.caixa.gov.br/Downloads/habitacao-solucoes-pj-%20construcao-civil/Cartilha_Construtor_Pre_Contratacao.pdf). A leitura direta retornou redirecionamento circular; não foi tratada como especificação validada do fluxo de engenharia credenciada.

## Dependências para operações automáticas

- SIOP: usuário informou que ainda não possui a credencial específica de homologação. Nenhuma consulta autenticada real foi alegada.
- RAE: confirmar modalidade, modelo vigente e regras de cálculo com a documentação aplicável ao serviço.
- SIOPI: confirmar URL, perfil, unidade e fluxo completo com documentos, autenticação e evidência de conclusão.
- Banco do Brasil: confirmar atividade do credenciamento, plataforma utilizada e modelo/MECI correspondente.

Essas dependências são explícitas na interface. A existência de guias públicos não comprova que um único formulário ou fluxo se aplica a todas as operações.

## Persistência e validação

A migração `0008_integracoes_operacionais` adiciona `BANCO_BRASIL` a `SistemaExterno` e cria `configuracoes_operacionais`, única por empresa e sistema. Os comprovantes continuam em `Documento`; execuções manuais usam `ExecucaoExterna`, com origem, hash do documento e contexto da operação. Duplicatas concorrentes do mesmo documento/protocolo reutilizam o registro anterior.

- `npm run conferir`: tipos, lint, proteção contra dados fictícios na interface e testes unitários.
- `node scripts/validar-gov-banco.mjs --integracoes --navegador`: banco PostgreSQL isolado, migração e comparação de schema, testes de integridade e navegador local com dados sintéticos. Requer `GOV_PLAYWRIGHT_MODULE` e `GOV_BROWSER_EXECUTABLE` quando Playwright/navegador não estiverem no caminho padrão.
- `node scripts/integracoes-banco.mjs --aplicar`: backup completo de produção, migração com Prisma e conferência do checksum e estrutura do incremento. `--conferir` somente lê a estrutura já aplicada. Não altera índices GOV de trabalhos em paralelo.
- `node scripts/verificar-integracoes.cjs`: navegação de produção somente leitura, sem gravar tokens ou executar consultas externas.
