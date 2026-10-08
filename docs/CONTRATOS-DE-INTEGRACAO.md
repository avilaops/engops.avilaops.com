# Contratos de integração

## Entrada: login único

- Cookie `avila_sso` (domínio `.avilaops.com`), JWT HS256, `issuer: auth.avilaops.com`, segredo `SSO_JWT_SECRET` (mesmo valor do auth).
- Registro no auth: `src/lib/apps.ts` → `{ id: "engops", host: "engops.avilaops.com", nome: "EngOps", papelExigido: null }`.
- Quem entra: qualquer sessão válida do SSO **que seja membro de uma empresa no EngOps** (ou dono da plataforma). Papel do SSO (`ADMIN`/`CLIENTE`) não dá acesso sozinho.
- Sair: `POST /api/auth/logout` apaga o cookie no domínio pai e manda ao auth.

## Entrada: criar demanda por serviço

`POST /api/servico/demandas`, header `x-service-key: <ENGOPS_SERVICE_TOKEN>`.

```json
{
  "empresa": "silveira-cruz",
  "origem": "n8n-email",
  "numeroOs": "18453",
  "tipoServico": "AVALIACAO_IMOVEL",
  "prazo": "2026-09-20",
  "endereco": "Rua X", "numero": "10", "municipio": "Curitiba", "uf": "PR",
  "matricula": "12345", "areaM2": "184,32",
  "proprietarioNome": "João da Silva", "proprietarioDoc": "12345678909"
}
```

Resposta `201 { id, codigo, url }`. Campos seguem `esquemaDemanda`
(`src/servicos/demandas.ts`). `422` traz os problemas de validação.

## Saída: eventos

Ver [EVENTOS-DE-DOMINIO.md](EVENTOS-DE-DOMINIO.md). Envio para
`N8N_WEBHOOK_URL` com `x-avila-webhook-token`.

## Saída: documentos

Arquivos em R2 sob `engops/<empresa>/<codigo>/<pasta>/<arquivo>`. Leitura só
por URL assinada de 5 min emitida por `GET /api/documentos/<id>/arquivo`
(exige sessão e empresa). Nenhum bucket público.

## Saúde

`GET /api/health` → `{ ok, banco, commit, build, worker }`. É o que o deploy
espera antes de declarar "no ar".

## O que o EngOps NÃO faz

- Não cadastra cliente no CRM; emite `DemandaCriada` e o n8n decide.
- Não manda WhatsApp nem e-mail; emite evento.
- Não cria tarefa em Planner/Todoist; emite `AprovacaoSolicitada`, `ValidacaoFalhou`, `PrazoEmRisco`.
- Não executa nada em sistema externo enquanto a empresa está em modo sombra.
