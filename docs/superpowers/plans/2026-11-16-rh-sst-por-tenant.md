# EngOps • RH e Segurança do Trabalho por tenant • Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar módulos RH e SST selecionáveis por tenant, com cadastros operacionais, agenda e base documental personalizada.

**Architecture:** Catálogo de módulos tipado em TypeScript e relação por empresa no PostgreSQL. Serviços e páginas usam o isolamento existente por `empresaId`; o dono da plataforma gerencia ativações e o tenant administra seus dados habilitados.

**Tech Stack:** TypeScript • Next.js 16 • React 19 • Prisma 6 • PostgreSQL • Vitest

**Spec:** `docs/superpowers/specs/2026-11-16-rh-sst-por-tenant-design.md`

## Global Constraints

• Todo código de aplicação será TypeScript
• Não alterar nem apagar dados restaurados de produção
• Não executar deploy
• Preservar o isolamento por `empresaId`
• Somente dono da plataforma ativa módulos
• Textos de interface usam `•` como separador

## Review Focus

• Acesso direto a URL de módulo desabilitado deve ser recusado no servidor
• Administrador comum não pode habilitar módulo por chamada direta
• Funcionário de um tenant nunca aparece em outro
• Treinamento só aceita participante da mesma empresa
• Agenda não pode misturar eventos entre tenants

---

### Task 1: Ativação de módulos por tenant

**Files:** `prisma/schema.prisma`, `prisma/migrations/0009_modulos_rh_sst/migration.sql`, `src/dominio/modulos.ts`, `src/servicos/modulos.ts`, `src/app/empresas/page.tsx`, `src/app/acoes/modulos.ts`, `tests/unit/modulos.test.ts`

**Produces:** `ModuloEmpresa`, `MODULOS`, `exigirModulo(empresaId, modulo)` e ação exclusiva do dono.

- [ ] Escrever testes de catálogo, navegação filtrada e autorização
- [ ] Confirmar falha dos testes
- [ ] Criar schema, migração, serviço e controle na tela de empresas
- [ ] Confirmar testes verdes

### Task 2: Cadastros de RH

**Files:** `prisma/schema.prisma`, migração 0009, `src/servicos/rh.ts`, `src/app/rh/page.tsx`, `src/app/acoes/rh.ts`, componentes em `src/components/rh/`, `tests/unit/rh.test.ts`

**Produces:** setores, cargos e funcionários isolados por empresa.

- [ ] Escrever testes de validação e isolamento
- [ ] Confirmar falha dos testes
- [ ] Implementar serviços, ações e interface
- [ ] Confirmar testes verdes

### Task 3: Segurança do Trabalho

**Files:** `prisma/schema.prisma`, migração 0009, `src/servicos/sst.ts`, `src/app/sst/page.tsx`, `src/app/acoes/sst.ts`, componentes em `src/components/sst/`, `tests/unit/sst.test.ts`

**Produces:** NRs, treinamentos, participantes, certificados, listas e ordens de serviço.

- [ ] Escrever testes de vínculo e validade
- [ ] Confirmar falha dos testes
- [ ] Implementar serviços, ações e interface
- [ ] Confirmar testes verdes

### Task 4: Agenda integrada

**Files:** `prisma/schema.prisma`, migração 0009, `src/servicos/agenda.ts`, `src/app/agenda/page.tsx`, `src/app/acoes/agenda.ts`, `tests/unit/agenda.test.ts`

**Produces:** compromissos manuais e leitura unificada de treinamentos e vencimentos.

- [ ] Escrever testes de intervalo e isolamento
- [ ] Confirmar falha dos testes
- [ ] Implementar calendário mensal e próximos eventos
- [ ] Confirmar testes verdes

### Task 5: Navegação, configuração e verificação

**Files:** `src/lib/navegacao.ts`, `src/components/SideNav.tsx`, `src/components/AppShell.tsx`, `src/app/empresa/page.tsx`, documentação e testes existentes.

**Produces:** menus condicionais, configuração por tenant e execução local validada.

- [ ] Integrar módulos à navegação desktop e móvel
- [ ] Aplicar migração em banco isolado e testar autorização
- [ ] Executar `npm run conferir` e `npm run build`
- [ ] Iniciar localmente e validar fluxos no navegador

