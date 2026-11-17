# Templates HTML e CSS para certificados NR

## Intenção

Substituir o certificado genérico do módulo SST por uma biblioteca de 38 temas próprios em HTML e CSS, um para cada NR, todos derivados diretamente da família visual dos modelos enviados por Guilherme. A mesma composição deve aparecer na pré-visualização do sistema e no PDF final, sem PowerPoint ou LibreOffice.

## Objetivos

• Entregar um tema visual individual para cada NR de 01 a 38 sem abandonar a estrutura, a linguagem gráfica e os componentes dos modelos do Guilherme.

• Gerar frente e conteúdo programático em formato paisagem A4.

• Preencher funcionário, CPF, empresa, CNPJ, treinamento, modalidade, datas, carga horária, conteúdo, instrutor, responsável técnico, registros e logos por tenant.

• Ajustar nomes e textos longos sem sobreposição, corte ou deslocamento.

• Permitir pré-visualização no navegador e emissão do mesmo resultado em PDF.

• Gerar lista de participação relacionada ao treinamento com a identidade do tenant e do cliente.

• Bloquear emissão para NR 02 e NR 27, mantendo seus temas apenas para catálogo com indicação de revogação.

## Fora do escopo

• Editar ou converter PowerPoint.

• Exportar apresentações.

• Permitir arrastar livremente elementos do certificado.

• Produzir conteúdo técnico inexistente sem revisão do responsável SST.

## Antirrequisitos

• O PDF não pode depender de fontes presentes apenas na máquina do operador.

• Pré-visualização e PDF não podem usar renderizadores diferentes.

• Campos variáveis não podem alterar a posição da estrutura visual.

• Nenhuma emissão pode misturar dados ou logos entre tenants.

## Abordagens consideradas

### HTML e CSS por tema • escolhida

Cada NR possui um componente temático próprio e usa componentes compartilhados para dados, assinaturas, logos e conteúdo. O navegador renderiza tanto a prévia quanto o PDF. Oferece ajuste responsivo de texto, integração direta com TypeScript e teste visual automatizado.

### SVG por tema

Oferece coordenadas precisas, mas aumenta a complexidade para textos extensos e exige tratamento específico para quebra e redução de fonte.

### PowerPoint como template

Preservaria arquivos existentes, mas dependeria do LibreOffice, de fontes locais e de conversões que já produziram diferenças de alinhamento. Foi descartada pelo usuário.

## Arquitetura

### Registro de templates

Um registro TypeScript associa o código normalizado da norma a:

• Identificador do tema

• Paleta e elementos gráficos

• Componente da frente

• Componente do conteúdo programático

• Conteúdo padrão editável

• Regras de modalidade e carga horária

• Situação de emissão

Os temas compartilham infraestrutura e a família visual definida pelos arquivos do Guilherme. Cada NR recebe variações de cores, grafismos, imagens e conteúdo relacionadas ao seu assunto, sem criar uma identidade paralela ou substituir o modelo de referência por um desenho genérico.

### Modelo de dados de renderização

O renderizador recebe um objeto validado e independente do banco com dados do tenant, cliente, funcionário, treinamento, norma, conteúdo, assinaturas e marcas. A consulta sempre filtra por `empresaId` antes de formar esse objeto.

### Componentes protegidos

O layout usa dimensões físicas de A4 paisagem e áreas com tamanho máximo. Nomes, títulos e conteúdo usam classes de densidade calculadas antes da renderização. Campos maiores reduzem a fonte dentro de limites definidos; se ainda não couberem, a emissão é bloqueada e a tela informa qual campo precisa de revisão.

### Logos e identidade

O sistema escolhe a variante da logo GRB pelo tema e usa a logo do cliente configurada no tenant. As imagens são armazenadas com identificação do tenant e convertidas para URL segura ou data URL durante a renderização. Ausência de logo usa uma reserva neutra sem deslocar o documento.

### Pré-visualização e PDF

Uma rota autenticada apresenta o documento HTML em modo de impressão. O PDF é gerado por Chromium a partir dessa mesma rota com fundos gráficos habilitados, tamanho A4 paisagem e margens zeradas. O arquivo emitido é vinculado ao certificado e não muda retroativamente quando o cadastro for alterado.

### Lista de participação

A lista usa A4 retrato, cabeçalho configurável, dados do treinamento, conteúdo programático, participantes, CPF, empresa e espaço de assinatura. Paginação ocorre por linhas completas, repetindo cabeçalho e identificação do treinamento.

## Fluxo do usuário

1. Cadastrar ou selecionar norma, treinamento e modalidade.
2. Definir conteúdo programático, datas, carga horária e responsável.
3. Adicionar participantes e registrar presença e aprovação.
4. Abrir pré-visualização do certificado ou da lista.
5. O sistema valida campos, logos e ajuste do conteúdo.
6. Emitir PDFs individuais ou em lote.
7. Armazenar o arquivo emitido e opcionalmente enviar por e-mail.

## Temas

Serão criados 38 identificadores de tema. NR 01, NR 06, NR 11, NR 12, NR 18 e NR 20 serão reconstruídas primeiro a partir dos modelos disponíveis, funcionando como referências concretas da família. Os demais temas serão extensões controladas desses mesmos modelos: estrutura, proporções, assinaturas, uso de logos, tratamento de imagens, placas NR, tipografia e composição seguirão o material do Guilherme; somente os elementos temáticos necessários para representar cada norma serão adaptados. Não será criada uma coleção visual independente.

NR 20 admite variantes como Iniciação e Básico dentro do mesmo tema, com conteúdo e carga horária próprios.

## Testes e conferência

• Testes unitários para normalização da NR, seleção do tema, isolamento por tenant e regras de emissão.

• Testes dos casos de nomes, empresas e conteúdos curtos e longos.

• Capturas visuais em tamanho real para frente e verso dos 38 temas.

• Comparação visual das seis NRs que possuem referência do Guilherme.

• Validação de PDF, número de páginas, texto esperado, logos e metadados.

• Verificação de lista com zero, um e múltiplos participantes e quebra em várias páginas.

## Entrega incremental

1. Infraestrutura HTML, CSS, prévia e PDF.
2. NR 01 e NR 20 para validar texto complexo e variantes.
3. NR 06, NR 11, NR 12 e NR 18.
4. Demais temas até NR 38.
5. Emissão em lote, armazenamento e envio por e-mail.

## Critério de conclusão

Os 38 temas aparecem no catálogo; os 36 vigentes podem ser pré-visualizados e emitidos; NR 02 e NR 27 aparecem como revogadas e não emitem; certificado e lista utilizam dados e logos do tenant correto; todos os PDFs passam pelas verificações funcionais e visuais sem cortes ou sobreposições.
