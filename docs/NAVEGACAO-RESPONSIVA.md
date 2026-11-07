# Navegação web e mobile

Incremento local, ainda sem publicação ou validação visual autenticada.

- Desktop: ícones por seção, identificação de grupo/seção atual, busca visível na lateral, atalhos para notificações e tema no cabeçalho.
- Mobile: seção e empresa no topo, busca e notificações acessíveis por toque, tema no menu Mais e áreas de toque maiores.
- A busca reutiliza o componente Sheet para contenção e restauração do foco, Escape e adaptação ao teclado móvel. Mantém Ctrl/Cmd+K, limita navegação às opções renderizadas, aceita pesquisa sem acentos e segue as permissões do menu.
- Link para pular ao conteúdo e indicadores de foco visíveis.
- Troca entre tabela e Kanban preserva parâmetros da URL. Filtros têm estado acessível e botão de limpeza que mantém a visualização.
- Em larguras intermediárias, a tabela omite a coluna Responsável; a informação continua disponível na demanda. No celular, permanece a apresentação compacta existente.

Validação automatizada: tipos, lint, verificação de dados fictícios e suíte existente. Verificação visual em desktop/mobile e fluxo autenticado ainda pendentes; testes unitários não validam layout nem gestos reais.
