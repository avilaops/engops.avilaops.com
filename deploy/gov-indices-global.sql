-- Preparação online antes do deploy da migração 0007 em uma base já populada.
-- Não bloqueia gravações durante a construção. Conferir indisvalid ao final.
\set ON_ERROR_STOP on
SET statement_timeout = '10min';
CREATE INDEX CONCURRENTLY IF NOT EXISTS gov_registros_ordenacao_global_idx
  ON gov_registros (publicado DESC NULLS LAST, id DESC) TABLESPACE engops_gov;
CREATE INDEX CONCURRENTLY IF NOT EXISTS gov_registros_tipo_valor_idx
  ON gov_registros (tipo, valor) TABLESPACE engops_gov;
SELECT c.relname, i.indisvalid, t.spcname
FROM pg_index i JOIN pg_class c ON c.oid=i.indexrelid
JOIN pg_tablespace t ON t.oid=c.reltablespace
WHERE c.relname IN ('gov_registros_ordenacao_global_idx','gov_registros_tipo_valor_idx');
ALTER TABLE gov_registros SET (
  autovacuum_vacuum_scale_factor = 0.01,
  autovacuum_analyze_scale_factor = 0.01,
  autovacuum_vacuum_insert_scale_factor = 0.02
);
-- Limpeza normal, sem VACUUM FULL e sem retirar a tabela de gravação.
VACUUM (ANALYZE) gov_registros;
