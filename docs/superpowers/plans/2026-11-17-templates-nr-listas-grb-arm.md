# Templates NR e listas GRB • A.R.M. • Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar 38 temas NR explícitos e gerar certificados e listas de presença em PDF com as logos reais GRB • A.R.M.

**Architecture:** O catálogo TypeScript define cada identidade visual sem fórmulas cíclicas. Certificado e lista compartilham um renderizador HTML e CSS seguro; Chromium produz A4 paisagem ou retrato a partir do mesmo HTML mostrado na prévia.

**Tech Stack:** TypeScript • Next.js 16 • Vitest • Playwright Chromium • Prisma

**Spec:** `docs/superpowers/specs/2026-11-17-templates-certificados-nr-design.md`

## Global Constraints

• Usar HTML e CSS • não PowerPoint.
• Preservar a linguagem visual dos modelos do Guilherme.
• Usar logo GRB como emissora e logo A.R.M. como cliente.
• Bloquear emissão para NR 02 e NR 27.
• Isolar todos os dados e arquivos por tenant.

## Review Focus

• Logos ausentes não podem deslocar o documento.
• Imagens externas e textos não podem injetar HTML.
• Lista longa deve paginar sem cortar linhas.
• Nomes e títulos longos devem permanecer dentro da página.
• NR 02 e NR 27 devem continuar não emitíveis.

---

### Task 1: Catálogo explícito dos 38 temas

**Files:**
• Modify: `src/dominio/templates-nr.ts`
• Modify: `src/servicos/renderizador-documentos-sst.ts`
• Test: `tests/unit/templates-nr.test.ts`

**Interfaces:**
• Produces: `TemplateNr` com `familia`, `grafismo`, `simbolo`, `acento`, `acentoSuave` e `indiceVisual`.
• Consumes: `CATALOGO_NR` para títulos oficiais e vigência.

- [ ] Escrever teste que exige 38 identidades explícitas, 38 símbolos e grafismos temáticos válidos.
- [ ] Executar o teste e confirmar falha pela ausência dos novos campos.
- [ ] Implementar o registro explícito e os grafismos HTML e CSS.
- [ ] Executar os testes unitários e confirmar aprovação.

### Task 2: Lista de presença HTML com GRB • A.R.M.

**Files:**
• Modify: `src/servicos/renderizador-documentos-sst.ts`
• Modify: `src/app/api/sst/treinamentos/[id]/lista/route.ts`
• Modify: `tests/unit/documentos-sst.test.ts`
• Create: `public/cliente-arm.png`

**Interfaces:**
• Produces: `renderizarListaParticipacaoHtml(dados)` e `gerarPdfDeHtml(html, { landscape })`.
• Consumes: configuração SST, logo do cliente e participantes filtrados pelo tenant na rota atual.

- [ ] Escrever testes de identidade dupla, escape, assinatura e paginação CSS.
- [ ] Executar os testes e confirmar falha por função inexistente.
- [ ] Implementar lista HTML e orientação configurável do PDF.
- [ ] Integrar logos e dados reais na rota de lista.
- [ ] Copiar o ativo oficial A.R.M. para `public/cliente-arm.png`.
- [ ] Executar testes, typecheck, lint e build.
