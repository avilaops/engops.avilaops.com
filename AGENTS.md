# engops.avilaops.com: regras para agentes

- **Leia `docs/` antes de mexer**: `ARQUITETURA.md`, `AUTOMATION-ENGINE.md`, `MODELO-DE-DADOS.md`, `ROADMAP.md`.
- **Next.js 16**: `params`/`searchParams` são Promise; não há `middleware.ts`, a proteção é `exigirOperador()` em cada página e action.
- **TypeScript estrito, português** em nomes, comentários, docs e UI.
- **Portão único**: `npm run conferir` (typecheck, lint, trava de dados falsos, testes). O deploy chama isso; não entregue sem passar.
- **Regra de negócio fora do React.** Componente chama server action (`src/app/acoes`), que chama serviço (`src/servicos`), que usa domínio (`src/dominio`).
- **Motor não conhece SIMIL.** Conhecimento de sistema externo só em `src/automation/adapters/`.
- **Nunca burlar** captcha, MFA ou controle de acesso. Etapa humana obrigatória = `pausar`.
- **Modo sombra é o padrão.** Driver real só atrás de `ModoAutomacao.REAL` e decisão do dono.
- **Toda escrita relevante** passa por `auditar()`; o que interessa a outro sistema passa por `emitirEvento()`. Na mesma transação.
- **Tela não desenha dado inventado.** `scripts/verificar-dados-falsos.mjs` reprova o build.
- **Segredos** só em `.env` (nunca commitado). Serviço fala com serviço por token no header.
- **Deploy**: `bash deploy/subir.sh` (build local, runtime no Hetzner apps-noclient, porta 3120).
