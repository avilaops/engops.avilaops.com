# Convites de equipe

O cadastro libera o acesso pelo login único. Para enviar uma mensagem, o administrador abre a pessoa em Equipe e usa **Enviar convite por e-mail**. Não há disparo automático nem retroativo.

O app usa `ENGOPS_CONVITE_WEBHOOK_URL` e `ENGOPS_CONVITE_WEBHOOK_TOKEN` para chamar o webhook autenticado existente do n8n. A credencial SMTP permanece no n8n. O contrato é `{ para, assunto, texto, nomeDe }`, com resposta `{ ok: true, messageId }`; HTTP 200 sozinho não comprova envio.

O serviço verifica empresa, membro ativo e papel do operador na server action. Um lock transacional por membro serializa solicitações concorrentes; tentativas ficam auditadas e bloqueiam reenvio por cinco minutos. Timeout pode significar resultado incerto: não há repetição automática. Aceitação pelo SMTP não comprova entrega à caixa de entrada.

O convite contém nome da empresa, papel e link de acesso, sem senha ou token de sessão. Nenhum fluxo externo de aprovação é dispensado pelo convite.

Integração reutilizada: workflow `A6Fgs43P5JeFQ8Ak`, **Auth - Enviar e-mail**, com SMTP `n8n@avilaops.com`. Não houve alteração nesse workflow. A autenticação reutiliza no servidor a credencial de webhook já configurada para o Auth, sem copiar o segredo para o repositório.

Testes automatizados usam respostas simuladas; não enviam mensagens. O primeiro envio real deve ser realizado pelo administrador na tela e acompanhado na auditoria e no n8n.
