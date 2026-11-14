# SIOP • WSExecucaoOrcamentaria no EngOps

Implementação solicitada em 14/11/2026 para o serviço federal de execução
orçamentária. A integração SIOPI de operações imobiliárias da CAIXA mantém o
[levantamento próprio](SIOPI-FUNCIONALIDADES.md).

## Contrato e diferenças verificadas

Fontes: [manual oficial](https://www1.siop.planejamento.gov.br/siopdoc/doku.php/webservices:manual-wsexecucaoorcamentaria),
[WSDL de homologação](https://testews.siop.gov.br/services/WSExecucaoOrcamentaria?wsdl)
e [catálogo ConectaGov](https://www.gov.br/conecta/catalogo/apis/consulta-execucao-orcamentaria).
O WSDL consultado está versionado em [contratos/WSExecucaoOrcamentaria.wsdl](contratos/WSExecucaoOrcamentaria.wsdl).

| Ponto | Manual | WSDL e implementação |
| --- | --- | --- |
| Operação | Exemplo consultarExecucaoPac. | consultarPac; única operação publicada. |
| Exercício do filtro | Exemplo exercicio. | anoExercicio. A API EngOps aceita exercicio como alias e recusa valores conflitantes. |
| Exercício no registro | Tabela anoExercicio, exemplo anoexercicio. | anoexercicio. |
| Credencial | usuario, senha, perfil na tabela. | Inclui também email opcional, presente no WSDL. |
| Valores monetários | numeric(16,2). | WSDL usa decimal; o cliente aplica a precisão do manual, sem arredondamento ou conversão para float. |
| Endereço | WSDL público HTTPS. | soap:address aponta HTTP:8080; o cliente utiliza o endpoint HTTPS público do mesmo serviço. |

O JSON Schema de todos os tipos está em
[contratos/WSExecucaoOrcamentaria.schema.json](contratos/WSExecucaoOrcamentaria.schema.json).
Os schemas Zod e tipos TypeScript ficam em `src/dominio/siop.ts`.

## Cobertura dos tipos

| Tipo | Representação e persistência |
| --- | --- |
| baseDTO | Tipo abstrato sem atributos. Schema vazio; não gera tabela vazia. |
| credencialDTO | usuario e senha obrigatórios; perfil e email opcionais no XSD. Metadados na tabela siop_credenciais; senha MD5 resolvida por referência ao ambiente somente durante a chamada. Perfil é exigido para consultar o PAC, conforme a regra do manual. |
| filtroExecucaoOrcamentariaPacDTO | anoExercicio opcional no XSD e exigido para a consulta pelo cliente; gravado em siop_consultas. |
| retornoDTO | sucesso obrigatório e mensagensErro opcionais, incluindo elementos nulos; gravado em siop_retornos. |
| retornoExecucaoPacDTO | Herda retornoDTO e agrega coleção opcional de execuções; relação entre siop_retornos e siop_execucoes_orcamentarias_pac. |
| execucaoOrcamentariaPacDTO | Todos os 40 campos listados abaixo. Códigos e descrições continuam texto. |
| consultarPac e consultarPacResponse | Wrappers SOAP de entrada e retorno, com schemas próprios. |

Ausência de mensagens é distinta de lista vazia e de mensagem nula. A presença
da coleção é registrada em execucoesPresentes; a ordem recebida é preservada
em ordem. Campos ausentes dos registros ficam NULL no banco. Dados adicionais
incompatíveis com o contrato são recusados, sem descartar silenciosamente campos.

## Tabelas e campos

- `siop_credenciais`: empresa, ambiente, usuario, email, perfil, senhaEnvRef,
  habilitada e datas. Uma configuração por empresa e ambiente. A senha não é
  armazenada; o MD5 do protocolo é um segredo de autenticação referenciado.
- `siop_consultas`: credencial e empresa, ambiente, anoExercicio, operação,
  solicitante, situação, datas e código de falha. Uma linha por consulta.
- `siop_retornos`: vínculo único com a consulta, empresa, sucesso,
  mensagensErro, presença da coleção e data.
- `siop_execucoes_orcamentarias_pac`: vínculo com retorno e empresa, ordem e
  os 40 campos do contrato. Ordem única por retorno; snapshots diferentes não
  são sobrescritos nem somados como se fossem um único resultado.

As chaves estrangeiras compostas incluem empresaId: uma credencial, consulta
ou retorno de outra empresa não pode ser vinculado apenas pelo ID. As rotas
aplicam também o filtro de empresa da sessão.

| Campo do DTO e coluna | Tipo armazenado | Ausência permitida no WSDL |
| --- | --- | --- |
| `acao` | text | Sim |
| `anoexercicio` | integer | Sim |
| `antecipado` | numeric(16,2) • string decimal no JSON | Sim |
| `autorizado` | numeric(16,2) • string decimal no JSON | Sim |
| `bloqueado_remanejamento_de_credito` | numeric(16,2) • string decimal no JSON | Sim |
| `bloqueado_rp2` | numeric(16,2) • string decimal no JSON | Sim |
| `bloqueado_rp3` | numeric(16,2) • string decimal no JSON | Sim |
| `descricaoesfera` | text | Sim |
| `descricaofuncao` | text | Sim |
| `descricaolocalizador` | text | Sim |
| `descricaoorgao` | text | Sim |
| `descricaosubfuncao` | text | Sim |
| `descricaouo` | text | Sim |
| `disponivel` | numeric(16,2) • string decimal no JSON | Sim |
| `dotacaoatual` | numeric(16,2) • string decimal no JSON | Sim |
| `dotacaoinicial` | numeric(16,2) • string decimal no JSON | Sim |
| `emp_liq_inscr_rap_np` | numeric(16,2) • string decimal no JSON | Sim |
| `empenhado` | numeric(16,2) • string decimal no JSON | Sim |
| `empenhoaliquidar` | numeric(16,2) • string decimal no JSON | Sim |
| `empenholiquidado` | numeric(16,2) • string decimal no JSON | Sim |
| `esfera` | text | Sim |
| `funcao` | text | Sim |
| `localizador` | text | Sim |
| `orgao` | text | Sim |
| `pago` | numeric(16,2) • string decimal no JSON | Sim |
| `pidescricao` | text | Sim |
| `plano_interno` | text | Sim |
| `programa` | text | Sim |
| `projetolei` | numeric(16,2) • string decimal no JSON | Sim |
| `rapapagar` | numeric(16,2) • string decimal no JSON | Sim |
| `rapcancelados` | numeric(16,2) • string decimal no JSON | Sim |
| `rapexerciciosanteriores` | numeric(16,2) • string decimal no JSON | Sim |
| `rapinscrito` | numeric(16,2) • string decimal no JSON | Sim |
| `rappago` | numeric(16,2) • string decimal no JSON | Sim |
| `rp_atual` | text | Sim |
| `rp_lei` | text | Sim |
| `subfuncao` | text | Sim |
| `tituloacao` | text | Sim |
| `tituloprograma` | text | Sim |
| `uo` | text | Sim |

## Consultas e API

A view `siop_totais_por_consulta` agrega os 19 valores monetários por consulta,
empresa, ambiente e exercício. Ela mantém a indicação de sucesso. Para usar
somente retornos aceitos, filtre sucesso = true. Ausência de valores produz
NULL, preservando a diferença entre ausência de dados e valor zero.
O arquivo [consultas/SIOP.sql](consultas/SIOP.sql) contém consultas parametrizadas
para configuração, histórico, retorno, registros paginados e totais.

| Rota | Método | Operação |
| --- | --- | --- |
| /api/integracoes/siop/configuracao | GET | Metadados da configuração e indicação da disponibilidade da credencial, sem o valor do segredo. |
| /api/integracoes/siop/configuracao | POST | Administrador configura usuario, email, perfil, ambiente, senhaEnvRef e habilitada. |
| /api/integracoes/siop/consultas | GET | Histórico da empresa, por ambiente; 50 consultas por página. |
| /api/integracoes/siop/consultas | POST | Executa consultarPac para anoExercicio, com ambiente padrão HOMOLOGACAO. |
| /api/integracoes/siop/consultas/[id] | GET | Retorno e registros da consulta da empresa; 100 registros por página, total informado. |

GET aceita ambiente quando aplicável e pagina nas listagens. POST exige
sessão, papel autorizado e Origin igual ao site configurado. As consultas
externas exigem automacao.executar; a leitura permite relatorio.ver ou
 automacao.executar. Configuração exige empresa.administrar.

A API não recebe senha no corpo: senhaEnvRef aponta para uma variável protegida,
como SIOP_EMPRESA_HML_MD5. O usuário informou que ainda não possui credencial de
webservice. A preparação do banco cria somente configurações de homologação
**desativadas**, sem usuario, perfil ou hash inventados. Nenhuma consulta de
homologação autenticada foi comprovada sem essa credencial.

O cliente usa SOAP 1.1, SOAPAction vazio, HTTPS, timeout de 60 segundos e
recusa redirecionamentos. O limite de resposta é 64 MiB; excedê-lo registra
falha e não importa dados parciais. SOAP Fault e falhas de transporte são
tratados sem expor XML ou detalhes de autenticação. O hash de autenticação,
se ecoado em mensagens do serviço, é removido antes da persistência.
Resultados são importados integralmente em transação, em lotes de 500 linhas.

## Migração e validação do banco

Migração aditiva versionada: `0004_siop_execucao_orcamentaria`.
Ela cria quatro tabelas, dois enums, chaves, índices, a view e as configurações
de homologação das empresas ativas. Não altera as tabelas de demandas/SIOPI.
A migração permanece registrada no controle nativo do Prisma.

O script `scripts/siop-banco.mjs` utiliza a conexão existente por um túnel SSH.
O endereço protegido fica somente na memória; nenhum segredo é gravado localmente
ou passado em argumento de shell.

```bash
node scripts/siop-banco.mjs --validar
node scripts/siop-banco.mjs --aplicar
node scripts/siop-banco.mjs --conferir
```

Validar cria um banco isolado, aplica as migrações pelo Prisma, confere os 40
campos, precisão decimal, integridade por empresa, ordem e agregação por snapshot.
O banco temporário é removido ao final. Aplicar cria e verifica um backup
restrito em /var/backups/engops, executa prisma migrate deploy e status e confere
a estrutura resultante. A publicação do aplicativo usa o fluxo de CI do projeto.
Conferir apenas verifica estado, diferenças do schema e estrutura. Em Windows,
um túnel aberto separadamente pode ser usado com a opção --porta=PORTA.

Para rollback da aplicação, mantenha a migração aditiva e desative a conexão.
Não remova tabelas com histórico para voltar uma versão do aplicativo. Restauração
de backup é operação distinta e exige avaliar o que foi gravado depois do backup.

## Verificação de cobertura

Os testes comparam os 40 campos e os 19 monetários ao WSDL versionado, exercitam
SOAP, booleanos, lista vazia, erro, mensagens nulas e precisão máxima. Testes de
serviço cobrem autorização, isolamento por empresa, ausência de credencial,
importação integral, falhas e proteção do segredo. A validação em PostgreSQL é
separada dos testes com mocks. A consulta real ao provedor depende da credencial.

## Evidência de aplicação • 14/11/2026

- Tipos, lint, verificação de dados fictícios e 130 testes locais aprovados.
- Migração validada em PostgreSQL isolado: os 40 campos, 19 monetários,
  chaves por empresa, ordem e snapshots independentes foram conferidos;
  o banco temporário foi removido.
- Migração 0004_siop_execucao_orcamentaria aplicada ao banco engops no servidor
  de aplicações, com prisma migrate deploy e status aprovados. A conferência
  prisma migrate diff confirmou correspondência entre o banco e o schema.
- Quatro tabelas e view conferidas. Uma configuração de homologação preparada,
  desativada; nenhuma consulta importada nesta preparação.
- Backup verificado: /var/backups/engops/engops-pre-siop-20261114211006674.dump.
- A consulta autenticada ao provedor continua pendente da credencial informada
  como ainda indisponível pelo usuário.
