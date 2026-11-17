# Estabilização SST e R2 • Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fazer a versão local passar em testes e build, armazenar documentos SST no R2 privado e deixá-la apta para revisão antes do deploy.

**Architecture:** Manter o banco e as rotas atuais, corrigindo os contratos já expressos nos testes. Reutilizar `src/lib/storage.ts` como fronteira única entre disco local e R2, persistindo no banco apenas a chave imutável do objeto.

**Tech Stack:** Next.js 16 • TypeScript • Prisma • SQLite local • pdf-lib • Cloudflare R2 via AWS SDK S3 • Vitest.

**Spec:** `docs/superpowers/specs/2026-11-17-templates-certificados-nr-design.md`

## Global Constraints

• Usar `•` em textos e rótulos, salvo sintaxe técnica.

• R2 privado `avilaops-engops-documentos`; downloads somente autenticados e assinados.

• Não fazer deploy enquanto testes, typecheck e build não passarem.

• NR 02 e NR 27 permanecem revogadas e não emitem certificados.

• Toda consulta e chave de objeto deve preservar isolamento por tenant.

## Review Focus

• Códigos de NR com zeros extras devem normalizar sem liberar normas revogadas.

• Datas da agenda devem usar o dia operacional de São Paulo.

• Documentos extensos devem paginar sem perder conteúdo.

• URLs de logo externas ou inseguras devem ser rejeitadas.

• Uma falha no upload R2 não pode gravar no banco um certificado inexistente.

---

### Task 1: Contratos de domínio SST, módulos e agenda

**Files:**
- Modify: `src/dominio/sst.ts`
- Modify: `src/dominio/modulos.ts`
- Modify: `src/dominio/agenda.ts`
- Test: `tests/unit/sst.test.ts`
- Test: `tests/unit/modulos.test.ts`
- Test: `tests/unit/agenda.test.ts`

**Interfaces:**
- Produces: `normaSchema`, `treinamentoSchema`, `podeAlterarPessoas`, `intervaloDoMes`, `chaveDataOperacional`.

- [ ] Rodar os testes dos três domínios e confirmar as falhas atuais.
- [ ] Implementar somente os contratos exigidos pelos testes, usando `America/Sao_Paulo` para agenda.
- [ ] Rodar os testes novamente e confirmar aprovação.

### Task 2: Configuração SST segura por tenant

**Files:**
- Modify: `src/dominio/configuracao-sst.ts`
- Test: `tests/unit/configuracao-sst.test.ts`

**Interfaces:**
- Produces: schema que aceita logos ausentes como `null` e rejeita URLs externas não autorizadas.

- [ ] Confirmar as duas falhas do schema.
- [ ] Normalizar campos opcionais e limitar logos a caminhos internos ou chaves de storage.
- [ ] Rodar os testes da configuração SST.

### Task 3: Documentos SST paginados e nomes seguros

**Files:**
- Modify: `src/servicos/documentos-sst.ts`
- Test: `tests/unit/documentos-sst.test.ts`

**Interfaces:**
- Produces: `normaPodeEmitirCertificado`, `nomeArquivoSeguro`, geradores paginados de lista e ordem de serviço.

- [ ] Confirmar as três falhas atuais.
- [ ] Corrigir normalização de NR e implementar paginação real de listas e OS.
- [ ] Rodar os testes de documentos SST.

### Task 4: Persistência de certificados e listas no storage

**Files:**
- Modify: `src/app/acoes/sst.ts`
- Modify: `src/app/api/sst/certificados/[participanteId]/pdf/route.ts`
- Modify: `src/app/api/sst/treinamentos/[id]/lista/route.ts`
- Modify: `src/lib/storage.ts`
- Test: `tests/unit/storage-sst.test.ts`

**Interfaces:**
- Consumes: `gravarArquivo(chave, buffer, mime)` e `urlDeDownload(chave, nomeArquivo)`.
- Produces: chaves `engops/<empresaId>/sst/certificados/<numero>.pdf` e `engops/<empresaId>/sst/listas/<treinamentoId>.pdf`.

- [ ] Escrever testes para chave por tenant, gravação antes do registro e download privado.
- [ ] Confirmar falha dos novos testes.
- [ ] Integrar emissão e lista ao adaptador existente sem duplicar cliente S3.
- [ ] Rodar os testes de storage SST.

### Task 5: Verificação de release local

**Files:**
- Modify somente arquivos exigidos por erros reais encontrados nesta etapa.

- [ ] Rodar `npm test -- --maxWorkers=1`.
- [ ] Rodar `npm run typecheck`.
- [ ] Rodar `npm run lint`.
- [ ] Rodar `npm run build`.
- [ ] Validar no navegador criação de tenant, ativação RH/SST, agenda, emissão e download.
- [ ] Registrar qualquer bloqueio restante e manter deploy suspenso até zero falhas.
