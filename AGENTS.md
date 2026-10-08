# engops.avilaops.com: regras para agentes

<!-- avilaops:contexto:inicio (versão 2026-10-03; gerado a partir de avilaops/contexto, não editar aqui) -->
## Contexto Ávila Ops (vale para todos os projetos)

Este repositório pertence à Ávila Ops Tecnologia, que ajuda pequenas empresas a construir presença digital, organizar a operação e crescer. As contas `avilaops` e `avilainc` no GitHub são a mesma empresa. Nicolas Avila (Nicolas sem acento) é o fundador e quem decide.

### Como trabalhar

- Comunicar em português natural, com resposta direta e evidência. Sem tom de coach, promessa vaga ou jargão comercial. O idioma da interface e do conteúdo acompanha o site, não a conversa.
- Identificar o projeto, o domínio, o repositório e o ambiente antes de alterar qualquer coisa. Não presumir que todos os projetos usam o mesmo deploy.
- Ter iniciativa dentro do pedido e levar a tarefa até um resultado verificado. Plano, código, publicação e funcionamento comprovado são coisas diferentes: não declarar sucesso só porque um build terminou ou um workflow foi ativado.
- Proteger dados, acessos e a separação entre clientes. Nunca gravar segredo em arquivo versionado, issue, PR ou memória.
- Não iniciar comunicação externa nem ação irreversível sem autorização do Nicolas.
- Preservar trabalho em andamento de outra pessoa ou de outro agente. Trabalho não commitado vai para uma branch `resgate/*`.

### Decisões vigentes

- Pagamentos: Mercado Pago no Brasil e PayPal para clientes de fora. Não usar Stripe nem Éfi, mesmo que material antigo diga o contrário.
- Automações em n8n, infraestrutura em Cloudflare e canais em Twilio, preservando integrações existentes.
- Ofertas com três planos: entrada limitada, intermediário como escolha principal e premium como referência. Consultar preços vigentes antes de publicar.
- Build de aplicação roda no GitHub Actions, não no servidor de produção.
- Versão antiga de código fica no GitHub. Não criar `.tgz`, `.tar`, `*-before-*` nem pastas `rollback/`, `releases/` ou `backups/` com código no servidor; voltar versão é republicar o commit. Antes de mexer em dado, fazer dump do banco.

### Sessões na nuvem

- Uma sessão de nuvem não tem acesso à máquina do Nicolas, aos servidores nem à memória compartilhada. Não presumir o estado de produção: buscar evidência ou dizer que não foi verificado.
- Decisão durável tomada na sessão deve ficar registrada na descrição do PR e, quando for do projeto, neste arquivo, fora deste bloco.
- A memória compartilhada completa e as regras corporativas ficam no repositório privado `avilaops/contexto`.
<!-- avilaops:contexto:fim -->

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
