BEGIN;
-- A direção e a posição dos nulos precisam coincidir com a paginação global.
CREATE INDEX IF NOT EXISTS "gov_registros_ordenacao_global_idx"
  ON "gov_registros" ("publicado" DESC NULLS LAST, "id" DESC);
-- Permite contar e somar por etapa sem carregar os documentos JSON.
CREATE INDEX IF NOT EXISTS "gov_registros_tipo_valor_idx"
  ON "gov_registros" ("tipo", "valor");
-- A coleta revisita registros continuamente. Manter o mapa de visibilidade
-- atualizado evita buscas aleatórias no heap durante contagens pelo índice.
ALTER TABLE "gov_registros" SET (
  autovacuum_vacuum_scale_factor = 0.01,
  autovacuum_analyze_scale_factor = 0.01,
  autovacuum_vacuum_insert_scale_factor = 0.02
);
COMMIT;
