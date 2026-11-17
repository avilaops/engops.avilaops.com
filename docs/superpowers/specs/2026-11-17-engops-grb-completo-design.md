# EngOps GRB completo • design

## Intenção

Transformar os módulos RH e SST existentes em uma operação utilizável pela GRB e seus clientes. A GRB é a prestadora e opera um tenant; dentro dele existem empresas clientes, e cada cliente possui seus próprios setores, cargos, funcionários e dados de SST. RH é o módulo que organiza essa estrutura, não uma entidade cadastrável. Documentos ficam no R2 e combinam identidade GRB com identidade do cliente.

## Decisões

• TypeScript e Next.js existentes • PostgreSQL e Prisma existentes • HTML/CSS como fonte visual dos documentos • Playwright/Chromium para PDF quando o template exigir fidelidade visual • R2 privado para arquivos • webhook/n8n para e-mail • nenhuma dependência de PowerPoint ou Ollama.

## Escopo

• Tenant GRB e módulos RH/SST ativos • empresas clientes vinculadas à GRB • setores, cargos e funcionários separados por cliente • catálogo das NR 01 a 38, com NR 02 e NR 27 revogadas • 38 temas documentais baseados na linguagem dos modelos do Guilherme • conteúdo programático editável por NR • logos GRB e cliente • certificados, listas e ordens de serviço vinculados ao cliente correto • agenda e alertas • envio por e-mail • auditoria, testes e deploy.

## Abordagens consideradas

1. PDFs desenhados diretamente com `pdf-lib` • simples, mas não reproduz os modelos com fidelidade.
2. Um HTML diferente e duplicado para cada NR • visualmente flexível, mas difícil de manter.
3. Biblioteca componentizada HTML/CSS com dados e tokens por NR • escolhida, pois preserva diferenças visuais sem duplicar a estrutura e permite pré-visualização e PDF.

## Critérios de conclusão

• Um administrador da GRB consegue cadastrar uma empresa cliente e, dentro dela, cadastrar setores, cargos e funcionários, agendar treinamento, registrar presença, emitir certificado temático, gerar lista e OS, armazenar tudo no R2 e enviar certificado por e-mail.
• Nenhum setor, cargo, funcionário ou documento de uma empresa cliente aparece em outra empresa cliente, mesmo pertencendo ao mesmo tenant GRB.
• Cada uma das 38 NRs possui tema e conteúdo identificáveis; NR 02 e NR 27 não permitem emissão.
• Operações são isoladas por tenant, auditadas e verificadas por testes.
• Produção passa em healthcheck e em um fluxo de fumaça real.
