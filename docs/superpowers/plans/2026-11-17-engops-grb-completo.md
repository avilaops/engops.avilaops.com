# EngOps GRB completo • plano de implementação

**Spec:** `docs/superpowers/specs/2026-11-17-engops-grb-completo-design.md`

## Restrições globais

• TDD por tarefa • isolamento obrigatório em dois níveis: tenant GRB por `empresaId` e empresa cliente por `clienteId` • nenhuma credencial no repositório • textos de UI usam `•` • PDFs finais no R2 com fallback local apenas em desenvolvimento • não publicar uma etapa com suíte vermelha.

## Task 1 • Base GRB e catálogo NR

Criar serviço idempotente de bootstrap da GRB, ativar RH/SST, introduzir empresa cliente como escopo operacional do RH/SST e semear NR 01 a 38 com estado vigente/revogada e conteúdo inicial. Migrar dados existentes com segurança. Adicionar testes de idempotência, isolamento por cliente, normalização e bloqueio de NR 02/27.

## Task 2 • Domínio de templates e identidade

Criar catálogo tipado de 38 temas, tokens visuais, conteúdo programático e resolução de logos/configuração por tenant. Testar presença, unicidade e completude dos 38 temas.

## Task 3 • Renderização HTML/CSS e PDF

Implementar certificado frente/verso, lista e OS em componentes HTML/CSS, pré-visualização segura e geração PDF. Aplicar logos, responsável, cliente, assinaturas e paginação. Testar escape, layout e geração válida.

## Task 4 • RH operacional

Adicionar seleção e cadastro de empresa cliente; dentro dela, detalhes, edição, desligamento/reativação, busca, filtros e histórico de funcionário, setor e cargo. Testar RBAC e isolamento por tenant e por cliente.

## Task 5 • SST operacional

Adicionar edição/cancelamento de treinamento, conteúdo, presença em lote, histórico/reemissão/invalidação de certificado, revisão/aceite de OS e filtros. Testar transições e auditoria.

## Task 6 • Agenda e alertas

Adicionar responsáveis, status, recorrência simples, lembretes e alertas de vencimento de certificados/treinamentos. Testar fuso de São Paulo e deduplicação.

## Task 7 • E-mail e arquivos

Configurar driver n8n, fila/registro de envio, anexos vindos do R2 e nova tentativa segura. Cobrir adapter R2 e rotas por integração.

## Task 8 • Onboarding e CNPJ

Integrar CNPJWS à criação/edição do tenant e criar assistente de configuração dos módulos, identidade e logos. Garantir que a GRB apareça e possa operar clientes.

## Task 9 • UX e responsividade

Separar telas sobrecarregadas, criar navegação por recursos, estados vazios, feedback de ações e layouts móveis.

## Task 10 • Verificação e produção

Executar suíte, lint, typecheck, build, revisão independente, correções importantes, migrações, deploy e fluxo de fumaça em produção com R2 e e-mail.

## Foco da revisão final

• vazamento entre tenants • autorização em server actions e rotas • HTML não escapado • objetos órfãos no R2 • reemissão concorrente • timezone • NR revogadas • documentos extensos • segredos • compatibilidade das migrations.
