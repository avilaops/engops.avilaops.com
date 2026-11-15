# Integração da sidebar animada

## Escopo

Integrar o componente e a referência fornecidos ao EngOps existente, em Next.js,
React, TypeScript e Tailwind CSS 4. Usar `src/components/ui` (o alias
`@/components/ui`), sem criar outra cópia do projeto. Preservar rotas,
permissões, busca, empresa selecionada e os dados reais.

## Plano

- [x] Instalar `motion`, `lucide-react`, `clsx` e `tailwind-merge`; declarar os
  caminhos no `components.json` e mapear os tokens shadcn aos temas existentes.
- [x] Adicionar testes de renderização para navegação por papel, estado ativo,
  acessibilidade da barra recolhida e contrato do provider.
- [x] Copiar o componente, auxiliares e demo para `src/components/ui`; adaptar
  os imports, textos de acessibilidade e pequenos pontos de compatibilidade.
- [x] Integrar ao AppShell, SideNav e MobileNav: trilho recolhível no desktop,
  drawer no celular e atalho Ctrl/Cmd+B. Preservar as abas móveis.
- [x] Rodar typecheck, lint, dados-falsos e testes. Conferir no navegador em
  desktop e celular, incluindo foco, Escape e movimento reduzido.

## Verificação e limites

Nenhuma migração ou escrita no banco faz parte desta integração. A aplicação
local está conectada à produção; os testes de interface só navegam e acionam
controles de apresentação. Não publicar nem fazer push automaticamente.

O componente principal e a demo foram fornecidos pelo usuário; os auxiliares
vêm do registro oficial https://beui.dev/r/animated-sidebar.json.

## Caminhos

- Componentes: `src/components`; primitivas reutilizáveis: `src/components/ui`.
- Estilos e tokens: `src/app/globals.css`.
- Classes condicionais: `src/lib/utils.ts`.
- O `components.json` permite ao CLI shadcn encontrar esses caminhos e evita
  criar uma segunda pasta `components/ui` fora de `src`.

## Resultado da revisão e da checagem visual

- Navegação real mantida; demonstração guardada em `src/components/ui/demo.tsx`,
  sem rota pública nem dados fictícios nas telas operacionais.
- Desktop testado em 1440, 820 e 768 px; mobile em 767 e 390 px. Nenhum
  transbordamento horizontal. Temas claro e escuro inspecionados.
- Recolhimento, expansão e Ctrl/Cmd+B conferidos. Gaveta móvel com Tab circular,
  Escape, restauração de foco e suporte a movimento reduzido.
- Corrigido o seletor de foco do componente fornecido para ignorar elementos
  ocultos, negativos na tabulação e inertes.
- Ctrl/Cmd+K e busca por clique fecham a gaveta antes da busca global para
  evitar dois diálogos concorrentes. Revisão independente sem pendências
  importantes após a correção.
- Browser executado com requisições de escrita bloqueadas.
- `npm run conferir`: TypeScript, ESLint e verificação de dados-falsos aprovados;
  94 testes aprovados em 14 arquivos, incluindo os seis novos testes da sidebar.
- `npm run build`: compilação otimizada e geração de páginas concluídas.
