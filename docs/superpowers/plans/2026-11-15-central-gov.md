# Central GOV • Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans para executar neste contexto.

**Goal:** Publicar Central GOV no EngOps e tenant Ávila Ops, centralizando login GOV no Auth.

**Architecture:** Adaptadores HTTP fixos PNCP/Compras normalizam resultados paginados. Consultas públicas não exigem credenciais GOV. Salvos e notas usam empresa da sessão e autorização existente. Auth mantém a integração de identidade.

**Tech Stack:** Next.js, TypeScript, Prisma/PostgreSQL, Vitest; Auth usa node:test.

**Spec:** docs/superpowers/specs/2026-11-15-central-gov-design.md

## Global Constraints

• Sem filtro por atividade/CNAE.
• Empresa Ávila Ops • CNPJ 67.954.417/0001-64.
• URLs oficiais fixas, timeout, validação, valores ausentes preservados.
• Sem envio de propostas/lances. Sem confundir login e autorização de API.
• Preservar tenants, stack ativa e trabalho existente. Usuário autorizou implementação e publicação; executar diretamente, sem nova rodada de confirmação.

## Review Focus

• Filtros locais não podem aparecer como busca global.
• PCA contém planos com itens e anos distintos da data de atualização.
• Erros externos não equivalem a lista vazia.
• Salvos de outra empresa são inacessíveis.
• Ambiente GOV, PKCE e validação de tokens devem ser coerentes.

## Tarefas

- [x] Adaptadores em src/integracoes/gov.ts e testes tests/unit/gov.test.ts: paginação, erros, datas, links e normalização de propostas, publicações, PCA e pregões. Provar falha inicial e sucesso.
- [x] Salvos em prisma/schema.prisma, migração 0005_central_gov e src/servicos/gov.ts; testar isolamento, autorização e upsert idempotente. Provisionamento tenant idempotente com auditoria.
- [x] Tela src/app/gov/page.tsx, detalhes, formulário e navegação compartilhada. Consultar todas as áreas, filtros explícitos, origem, salvos e notas.
- [x] Auth: validar estado não secreto do conector; corrigir ambiente, PKCE e validação GOV em src/lib/provedores.ts, oauth.ts e módulo GOV dedicado. Testes node:test.
- [ ] Executar conferir/build EngOps, testes/tipos/lint/build Auth; revisar diffs; backup e migração; publicar pelos pipelines existentes; verificar tenant, isolamento, consultas reais, autenticação e revisão publicada.

## Registro

• Base EngOps 46488d0, worktree inicialmente limpo exceto documento desta iniciativa. Produção e07fe23.
• Execução direta neste contexto. A autorização já foi dada; não repetir aprovação de plano.
• Migrações deploy/status/diff e regressão SIOP aprovados em banco isolado. Corrigido ON UPDATE CASCADE para correspondência exata do schema.
• Ávila Ops criada em produção e script repetido confirmou idempotência. Backup /var/backups/engops/engops-pre-central-gov-20261115.dump verificado.
• Auth: 416 testes aprovados e build local aprovado; conector sem credenciais oficiais, usuário confirmou que a integração precisava ser implementada. Pronto para configurar sem exigir gov.br nas consultas públicas.
• Consulta real de 50 registros sofreu timeout; paginação ajustada para 10 contratações ou um plano com seus itens, mantendo acesso a todas as páginas e salto por número.
