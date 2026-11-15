# Central GOV • Ávila Ops

## Objetivo

Integrar ao EngOps uma central para consultar e analisar demandas públicas, sem limitar por CNAE ou área de atuação. Criar ou reutilizar a empresa Ávila Ops, CNPJ 67.954.417/0001-64, preservando a empresa de engenharia existente e o isolamento por tenant.

## Abordagens

1. Consulta direta às APIs oficiais • reduz atraso e permite navegar páginas completas; depende da disponibilidade dos provedores. Recomendada para a primeira entrega.
2. Espelho nacional com ingestão contínua • permite busca analítica global, mas exige operação de coleta, reconciliação e armazenamento em escala. Evolução posterior, sem prometer cobertura inexistente.

O usuário aprovou a primeira abordagem, com persistência das oportunidades salvas por empresa, e solicitou que o acesso GOV fique centralizado no Auth existente. Login gov.br identifica a pessoa e não substitui credenciais de APIs restritas; as consultas públicas não dependem dele.

## Comportamento

Uma nova seção Central GOV reúne oportunidades abertas, publicações, planejamento anual e pregões do Compras.gov.br. Cada consulta identifica fonte, período, atualização, paginação e limitações. Não afirma que uma página de resultados representa toda a demanda nacional.

Filtros por texto, UF, órgão, modalidade, datas e valor, conforme suporte dos provedores. Filtros aplicados apenas à página recebida serão identificados explicitamente. Nenhum recorte por atividade da Ávila Ops. Dados e links oficiais acessíveis nos detalhes; valores ausentes não serão apresentados como zero. Falhas de API não serão tratadas como ausência de oportunidades.

Oportunidades podem ser salvas com notas e situação de análise por empresa. Autenticação e seleção de empresa usam o SSO e os papéis existentes. Operações persistidas sempre usam a empresa da sessão, nunca uma empresa fornecida pelo navegador.

## Fontes verificadas

Contratos OpenAPI consultados em 15/11/2026:

• https://pncp.gov.br/api/consulta/v3/api-docs
• https://dadosabertos.compras.gov.br/v3/api-docs

PNCP: contratações com propostas abertas, publicações por modalidade e PCA. Compras.gov.br: consultas de pregões do módulo legado, identificadas como tal, sem confundir histórico com oportunidade aberta. Contrata+Brasil depende de validação de uma interface pública documentada e não será apresentado como integração concluída sem evidência.

## Segurança e operação

URLs de provedores fixas, parâmetros validados, timeout e limites de paginação. Conteúdo externo é texto, sem HTML executável. Cadastro idempotente do tenant, com auditoria e acesso administrativo para a identidade já configurada do proprietário; sem criar senhas ou enviar convites.

Deploy usa o pipeline atual do repositório e o servidor SSH applications. A documentação antiga de deploy manual não reflete a stack ativa, que usa o container engops-avilaops-com-web na rede edge. Migrações exigem backup e verificação.

## Aceite

Tenant correto disponível no seletor; Central GOV acessível após autenticação; consultas reais e paginação nas duas fontes; filtros sem recorte de atividade; detalhes e origem; salvos isolados por tenant; tratamento de falhas; verificações do repositório e build aprovados; publicação e runtime conferidos no domínio solicitado.

Não inclui envio de proposta ou lances, publicação de editais, integração restrita ao Conecta, nem garantia de cobertura de todos os portais nacionais.

## Evidências de viabilidade • 15/11/2026

• PNCP propostas: requisição real com `dataFinal=20261231&pagina=1&tamanhoPagina=10` retornou 30.023 registros e 3.003 páginas. Uma oportunidade publicada em 2023 tinha encerramento informado em dezembro de 2026. Portanto, ano de publicação não determina sozinho se uma oportunidade está aberta; conferir as datas e o estado informado pelo provedor.
• PNCP planejamento: requisição real a `/v1/pca/atualizacao?dataInicio=20261114&dataFim=20261115&pagina=1&tamanhoPagina=10` retornou 30.011 registros e 3.002 páginas. O primeiro plano era de 2027 e continha uma lista `itens`, incluindo contratação de e-mail em nuvem e serviços de treinamento. A central precisa navegar planos e seus itens, mantendo a identidade de cada item e o ano do plano, sem confundir data de atualização com data desejada de contratação.
• Compras.gov.br legado: consultas com datas válidas, conforme contrato `YYYY-MM-DD`, responderam sem registros nos intervalos testados. Essa evidência comprova resposta da API, mas ainda não comprova integração com um pregão real; isso permanece critério de aceite.
• Runtime: healthcheck interno em `http://172.31.0.18:3130/api/health` respondeu com banco OK e revisão `e07fe2377dc4ca347377f5f72db7bf1348137966`. Consulta somente de leitura ao banco confirmou um tenant existente, Silveira Cruz Engenharia, e nenhum tenant Ávila Ops.
