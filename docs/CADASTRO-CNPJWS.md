# Contratantes por CPF/CNPJ

O documento é o primeiro campo e é validado no cliente e no servidor. Para CNPJ, o botão de consulta preenche razão social, telefone e e-mail; o usuário revisa antes de cadastrar. Alterar o documento limpa os dados anteriores. Para CPF ou falha da API, o cadastro é manual.

Integração: `https://publica.cnpj.ws/cnpj/{cnpj}`, conforme https://docs.cnpj.ws/referencia-de-api/api-publica/consultando-cnpj . A API pública informa limite de três consultas por minuto. O servidor reutiliza respostas por até 24 horas e trata 404, 429, indisponibilidade e timeout de 15 segundos.

A consulta exige sessão e permissão de criar demandas. A resposta é validada e deve corresponder ao CNPJ solicitado. Ao salvar um cadastro consultado, o servidor recupera a resposta da fonte/cache; não aceita um JSON arbitrário enviado pelo navegador como resposta da API.

Migração `0002_cliente_dados_cnpj`: acrescenta `clientes.dadosCnpj` JSONB opcional. O retorno completo é preservado, inclusive campos adicionais; a interface mostra um resumo cadastral consultável após salvar. Nome e contato revisados ficam nos campos próprios. CPF não é enviado para a API.

Evidências: consulta real de leitura para o CNPJ fornecido pelo usuário retornou SILVEIRA CRUZ ENGENHARIA LTDA, Votuporanga; nenhum contratante foi criado por essa verificação. Suíte local: 88 testes aprovados, tipos/lint aprovados. Testes unitários não substituem validação visual autenticada.
