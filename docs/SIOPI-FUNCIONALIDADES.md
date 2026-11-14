# SIOPI • inventário funcional para o EngOps

Levantamento de 14/11/2026. Sistema observado: **SIOPI • Sistema de Operações
Imobiliárias**, na área **Habitação** da CAIXA. O destino deste levantamento é
o projeto **EngOps**.

## Fontes e cobertura

| Evidência | Origem | Conteúdo observado |
| --- | --- | --- |
| E01 | Primeira captura enviada pelo usuário nesta conversa, em 14/11/2026 | Página inicial, menu recolhido, mensagens, três buscas e 14 atalhos. |
| E02 | Segunda captura enviada pelo usuário nesta conversa, em 14/11/2026 | Mesma página com menu aberto, identificação do usuário e seletor de unidade física expandido. |

Este inventário cobre os controles identificáveis nessas duas capturas.
**Observado** significa que o elemento aparece na tela. As telas de destino,
os resultados de busca e as gravações ainda não foram demonstrados. Os nomes
dos atalhos indicam sua finalidade, mas não comprovam as regras internas.

Os separadores dos rótulos foram normalizados para `•`. A identificação pessoal
do usuário exibida na captura não é reproduzida neste documento.

## Navegação e contexto de acesso

O cabeçalho identifica a área Habitação e a CAIXA. A página se apresenta como
SIOPI • Sistema de Operações Imobiliárias.

| ID | Elemento | Observado | A confirmar |
| --- | --- | --- | --- |
| SIOPI-N01 | Abrir e fechar menu lateral | Ícone de menu em E01 e botão com X em E02; as capturas mostram os dois estados. | Efeito sobre a página e navegação por teclado. |
| SIOPI-N02 | Página inicial | Ícone de casa no menu aberto. | Destino e preservação dos filtros/contexto. |
| SIOPI-N03 | Configuração | Item do menu principal. | Submenus, parâmetros, campos, permissões e efeitos das alterações. |
| SIOPI-N04 | Serviços | Item do menu principal. | Serviços disponíveis e relação com OS de engenharia. |
| SIOPI-N05 | Proposta | Item do menu principal. | Submenus e operações permitidas para cada tipo de proposta. |
| SIOPI-N06 | Vendas | Item do menu principal. | Submenus, dados e relação com propostas e contratos. |
| SIOPI-N07 | Usuário da sessão | Identificação apresentada no bloco inferior do menu. | Perfil, permissões, renovação e expiração da sessão. A captura não mostra o login. |
| SIOPI-N08 | Unidade FÍSICA | Seletor expandido com a unidade disponível para a sessão. | Significado do código, unidades autorizadas e efeito da troca sobre consultas e operações. Uma opção visível não comprova acesso a outras unidades. |
| SIOPI-N09 | Saída da sessão • identificação parcial | Há texto parcialmente encoberto sob o seletor expandido, compatível com a opção de saída. | Confirmar rótulo completo, controle e comportamento em captura com o seletor fechado. |

## Mensagens da página inicial

| ID | Elemento | Observado | A confirmar |
| --- | --- | --- | --- |
| SIOPI-M01 | Mensagens | Bloco de avisos com indicação de ausência de alerta na sessão capturada. | Tipos de aviso, origem, severidade, validade e condições de exibição. |

Esse estado descreve a captura; não significa que o portal nunca tenha alertas.
O atalho Mensagens Anteriores aparece separadamente no acesso rápido.

## Buscas

| ID | Bloco | Entradas visíveis | Ação visível |
| --- | --- | --- | --- |
| SIOPI-B01 | Buscar Proposta | CPF e CNPJ, cada um com campo próprio. | Botão Buscar do bloco. |
| SIOPI-B02 | Buscar Pré-contratação | Nome Empreendimento e Nº Pré-Contratação. | Botão Buscar do bloco. |
| SIOPI-B03 | Buscar Proposta Online | CPF. | Botão Buscar do bloco. |

### Buscar Proposta

- CPF e CNPJ exibem marcações com dois asteriscos e indicadores laranja.
- A legenda e o conteúdo dos indicadores não aparecem nas capturas.
- Confirmar se CPF e CNPJ são alternativas ou podem ser combinados; não assumir
  que ambos são obrigatórios.
- Confirmar máscaras, validação, busca sem resultados, múltiplas propostas,
  paginação e campos apresentados ao abrir um resultado.

### Buscar Pré-contratação

- Nome Empreendimento exibe asterisco e indicador laranja; há também campo
  para Nº Pré-Contratação.
- Confirmar a regra de obrigatoriedade, combinação dos filtros, correspondência
  parcial do nome e formato do número.
- Confirmar a lista de resultados, o identificador do processo e as etapas
  disponíveis ao abrir a pré-contratação.

### Buscar Proposta Online

- O campo CPF exibe um asterisco.
- Confirmar máscara, validação, resultado e relação com as propostas da busca
  convencional.
- A existência de duas buscas não comprova que os registros ou seus
  identificadores sejam intercambiáveis.

Nenhuma busca foi executada neste levantamento. Mensagens de erro, tempos de
resposta e resultados não foram observados.

## Acesso rápido • 14 funcionalidades

Todos os atalhos abaixo aparecem nas duas capturas. A finalidade descrita é
indicada pelo rótulo; a tela interna de cada item continua pendente de abertura.

| ID | Atalho | Finalidade indicada | Detalhes a levantar na tela interna |
| --- | --- | --- | --- |
| SIOPI-A01 | Informativos | Acesso a comunicados do portal. | Listagem, período, leitura, anexos e alcance por unidade/perfil. |
| SIOPI-A02 | Mensagens Anteriores | Acesso ao histórico de mensagens. | Filtros, datas, situação de leitura e relação com o bloco Mensagens. |
| SIOPI-A03 | Ocorrências Pendentes | Acesso às ocorrências com pendência. | Tipos, identificadores, vínculo com proposta/OS, responsáveis e tratamento. |
| SIOPI-A04 | OS Pendentes | Acesso às ordens de serviço pendentes. | Número da OS, tipo de serviço, situação, prazo, responsável e detalhes. |
| SIOPI-A05 | Próximas Assinaturas Agendadas | Acesso aos agendamentos de assinatura. | Data, horário, participantes, proposta/contrato e eventual alteração ou cancelamento. |
| SIOPI-A06 | Últimos Retornos da Conformidade | Acesso aos retornos recentes de conformidade. | Resultado, data, motivo, documentos e ação exigida. |
| SIOPI-A07 | DAMPs Pendentes | Acesso a registros DAMP pendentes. | Significado oficial da sigla, situação, campos, prazo e ação disponível. |
| SIOPI-A08 | DAMPs Retornados | Acesso a registros DAMP retornados. | Motivo do retorno, histórico, ajustes e eventual reenvio. |
| SIOPI-A09 | Propostas Pendentes | Acesso às propostas com pendência. | Identificador, etapa, exigências, responsável e condição para regularização. |
| SIOPI-A10 | Nova Proposta Individual PF | Entrada para uma nova proposta individual de pessoa física. | Etapas, dados obrigatórios, validações, salvamento e confirmação. |
| SIOPI-A11 | Remuneração CCA • Contratos | Acesso à remuneração CCA relacionada a contratos. | Competência, contrato, valores, situação e eventual demonstrativo. |
| SIOPI-A12 | Remuneração CCA • OS | Acesso à remuneração CCA relacionada a OS. | Competência, OS, valores, situação e eventual demonstrativo. |
| SIOPI-A13 | Parâmetro de Pendência | Acesso à área de parâmetros de pendência. | Consulta ou edição, abrangência, campos, permissões e impacto sobre as pendências. |
| SIOPI-A14 | Originação Digital • Propostas Online | Acesso à área de propostas online da originação digital. | Listagem, etapas, identificadores e relação com Buscar Proposta Online. |

A tela não define a expansão das siglas DAMP e CCA. Não há evidência de regras
de cálculo de remuneração, pagamento automático, exportação ou edição dos
parâmetros; esses pontos devem ser verificados nas telas correspondentes.

## Relação com o EngOps

O EngOps já representa SIOPI como sistema externo em `ExecucaoExterna`, possui
estado `SIOPI_PENDENTE` e categoria documental SIOPI. A central de automações
apresenta o conector como **Não conectado**. O fluxo real ainda depende deste
levantamento e da definição da conexão.

Fontes do código consultadas: `prisma/schema.prisma`,
`src/dominio/demandas.ts`, `src/dominio/documentos.ts`,
`src/dominio/checklist.ts` e `src/app/automacoes/page.tsx`.

### Dados e decisões para a configuração

| Item | Evidência atual | Próxima confirmação |
| --- | --- | --- |
| Endereço do portal | A barra de endereço não aparece nas capturas. | URL exata do SIOPI e ambiente acessado. |
| Autenticação | As capturas mostram uma sessão já aberta. | Procedimento de entrada, perfil, expiração e eventual segundo fator. |
| Unidade física | Seletor visível no menu. | Código correto da unidade e abrangência dos dados acessíveis. |
| Busca de propostas | Três blocos documentados. | Regra de filtros, resposta e identificadores externos. |
| Relação com a demanda | EngOps possui demanda e execução externa; vínculo com os resultados do portal não foi observado. | Correspondência entre OS, proposta, pré-contratação e demanda. |
| Operações de escrita | Há atalho de nova proposta; formulário e confirmação não foram demonstrados. | Campos, etapas, revisões, protocolo e evidência de sucesso. |
| Interface de integração | Nenhuma API do SIOPI foi identificada nas fontes examinadas. | Contrato oficial aplicável ou fluxo do portal validado para integração. |

Esses itens são requisitos de levantamento. Este documento não cria conexão,
credencial, envio ou automação no EngOps.

## SIOPI da CAIXA e APIs do SIOP federal

O material do ConectaGov enviado pelo usuário identifica a base como **SIOP**
e trata de orçamento da União. O portal das capturas identifica **SIOPI** e
operações imobiliárias da CAIXA. A semelhança das siglas não estabelece relação
entre as interfaces.

| Referência conferida em 14/11/2026 | Escopo declarado | Consequência para este levantamento |
| --- | --- | --- |
| [Quantitativo do SIOP](https://www.gov.br/conecta/catalogo/apis/wsquantitativo-do-siop) | Consultas e cadastros orçamentários, incluindo acompanhamento e execução financeira do SIAFI. | Referência de outro sistema; não configura a conexão imobiliária. |
| [SIOP • Consulta Execução Orçamentária](https://www.gov.br/conecta/catalogo/apis/consulta-execucao-orcamentaria) | Consulta de execução orçamentária voltada à SDI, antiga SEPAC; operação `consultarPac`. | A página não documenta busca de proposta imobiliária, OS ou acesso à unidade física do SIOPI. |

Os WSDLs publicados nesses catálogos pertencem, respectivamente, a
`WSQuantitativo` e `WSExecucaoOrcamentaria`, no domínio `siop.gov.br`, com
ambientes de produção e homologação. O [manual do WSQuantitativo](https://www1.siop.planejamento.gov.br/siopdoc/doku.php/webservices:manual-wsquantitativo)
apresenta mensagens SOAP/XML. Esses endpoints não foram cadastrados no EngOps
como integração SIOPI. Esta verificação não conclui que uma API própria do
SIOPI seja inexistente; apenas mantém sua identificação como pendência.

## Próximas evidências para completar o mapa

1. Página inicial com o seletor fechado, para identificar integralmente os
   controles de sessão.
2. Abertura de Configuração, Serviços, Proposta e Vendas, com seus submenus.
3. Uma consulta e um resultado de cada bloco de busca, com dados pessoais
   ocultados quando não forem necessários ao levantamento.
4. Tela interna dos 14 atalhos, mantendo os IDs deste inventário como referência.
5. Em cada operação relevante à engenharia: campos, validações, documentos,
   estados, responsáveis, prazo, confirmação e comprovante/protocolo, se houver.
6. Definição do fluxo a integrar primeiro ao EngOps, a partir dessas evidências.

Novas capturas devem ampliar este inventário e registrar as diferenças de
perfil, unidade ou versão observadas. Uma função nova deve receber ID próprio;
um detalhe confirmado deve atualizar o ID já existente.
