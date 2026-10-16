# Contexto verificavel

- Identificador: `avila-engops-avilaops-com`.
- Origem: raiz deste checkout; nao depende de um caminho absoluto.
- Fontes encontradas: `README.md`, `package.json`, `AGENTS.md`.
- Gerenciador declarado: nao declarado no package.json; conferir lockfile e regras locais.

## Estrutura observada

- `deploy/`
- `docs/`
- `prisma/`
- `public/`
- `scripts/`
- `src/`
- `tests/`

## Scripts de verificacao declarados

- `lint`: `eslint`
- `typecheck`: `tsc --noEmit`
- `test`: `vitest run`
- `test:watch`: `vitest`

Esta lista e um retrato de 15/10/2026, nao uma prova de que os comandos passaram.
Confirme os comandos e seus efeitos antes de executa-los. Alguns testes dependem de servicos externos.
Nao execute deploy, migracao ou envio como parte de uma consulta de status.
