# Modelo de dados

Fonte: `prisma/schema.prisma`. Toda tabela de negócio tem `empresaId`.

```
Empresa 1─n Membro
Empresa 1─n Cliente
Empresa 1─n Demanda ─n Documento
                     ─n ItemChecklist
                     ─n Pendencia
                     ─n Job ─n EventoJob
                     ─n ExecucaoExterna (SIMIL | RAE | SIOPI)
                     ─n Aprovacao
Empresa 1─n Auditoria
Empresa 1─n EventoDominio (outbox)
Empresa 1─n Notificacao
```

| Tabela | Papel | Chaves e índices que importam |
|---|---|---|
| `empresas` | tenant; `modoAutomacao` (SOMBRA/REAL); `proximoCodigo` para ENG-0001 | `slug` único |
| `membros` | pessoa dentro da empresa, com papel | `(empresaId, email)` único |
| `clientes` | contratante da OS (não é o proprietário) | |
| `demandas` | a OS e sua jornada; imóvel e proprietário embutidos (uma OS, um imóvel) | `(empresaId, codigo)` único; índices por status, prazo, responsável, numeroOs |
| `documentos` | arquivo do dossiê: categoria (pasta), tipo, hash, versão, origem, `dados` conferidos | índice `(empresaId, hash)` para duplicado |
| `itens_checklist` | checklist calculado, persistido para a tela e para relatório | `(demandaId, chave)` único |
| `pendencias` | problema detectado (DETECTOR, CRUZADO, AUTOMACAO) ou aberto à mão (MANUAL); `resolvidaEm` nulo = aberta | |
| `jobs` | execução de workflow | `chaveIdempotencia` único; índice `(status, agendadoPara, prioridade)` para a fila |
| `eventos_job` | timeline | `(jobId, criadoEm)` |
| `execucoes_externas` | passagem por SIMIL/RAE/SIOPI com `dados` (campos) e `evidencias` | |
| `aprovacoes` | decisão humana | `(empresaId, status)` |
| `auditoria` | quem, o quê, antes, depois | `(empresaId, criadoEm)`, `(objetoTipo, objetoId)` |
| `eventos_dominio` | outbox para n8n/CRM/mensageria | `(entregueEm, criadoEm)` |
| `notificacoes` | in-app (Fase 9) | `(destinatario, lidaEm)` |

## Decisões

- **Imóvel e proprietário dentro da demanda**, não em tabelas próprias. Uma OS trata de um imóvel; a mesma pessoa em duas OS é coincidência, não relação. Quando houver reaproveitamento (mesmo proprietário em 30 OS), extrai-se `Property`/`Person` com migração; hoje seria abstração sem uso.
- **Checklist persistido, mas calculado.** A tabela existe para a tela e o relatório serem rápidos; a verdade é `calcularChecklist()`, rodado a cada mudança.
- **Sem `Template` nem `Deadline` ainda.** Prazo é coluna da demanda; templates entram quando a segunda empresa mostrar o que repete.
- **RAE e SIOPI usam a mesma `ExecucaoExterna`** com `sistema` diferente. Campos específicos vão em `dados` (JSON) até se estabilizarem.
- **Decimal para área e valor.** Nunca float em dado que vai para documento oficial.

## Migração

`prisma/migrations/0001_inicial/migration.sql` gerado por `prisma migrate diff`
a partir do schema. Aplicar com `npm run prisma:migrate` (usa `DATABASE_URL`).
