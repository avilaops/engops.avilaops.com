# EngOps • RH e Segurança do Trabalho por tenant

## Intenção

Adicionar RH e Segurança do Trabalho ao EngOps sem duplicar o Arxis BIM e sem transformar as personalizações dos clientes em código separado. O dono da plataforma escolhe quais módulos cada tenant utiliza; administradores do tenant configuram apenas os módulos habilitados.

## Escopo

• Catálogo fixo de módulos `RH` e `SST`, com ativação independente por empresa
• Bloqueio no servidor e ocultação na navegação quando um módulo não está habilitado
• RH com setores, cargos e funcionários
• SST com catálogo de NRs, treinamentos, participantes, certificados, listas e ordens de serviço
• Agenda mensal unificando compromissos manuais, treinamentos e vencimentos
• Configuração por tenant para identidade visual, responsável técnico, modelos e regras
• Consulta CNPJ.ws reaproveitando o serviço TypeScript existente
• PDFs e envio por e-mail como documentos auditáveis, sem PowerPoint

## Arquitetura escolhida

Uma tabela `modulos_empresa` relaciona empresa e módulo. O catálogo permanece em TypeScript para impedir chaves arbitrárias; a relação no banco registra ativação, configuração e auditoria. Todas as entidades de RH e SST carregam `empresaId` e passam pelo isolamento Prisma já usado pelo EngOps.

## Segurança

• Somente `ENGOPS_DONOS` altera módulos de qualquer tenant
• Administrador do tenant não consegue ativar módulos por ação direta
• Rotas e serviços conferem o módulo no servidor; esconder menus não é autorização
• Documentos, funcionários e treinamentos nunca são consultados sem `empresaId`
• Configurações e modelos são versionados e associados ao tenant

## Entrega local

Implementação integral em TypeScript, Prisma e PostgreSQL. Migrações e testes rodam contra banco local; nenhum deploy será realizado nesta etapa.

