-- Executar no banco engops somente após publicar a correção de fim PCA/Compras.
-- Reprocessa as fronteiras de todas as janelas anteriores sem apagar registros.
-- A marca de revisão impede que uma execução repetida reinicie coletas retomadas.
\set ON_ERROR_STOP on
BEGIN;
UPDATE gov_coletas SET
  cursor = '{"dia":"2021-04-01","pagina":1,"modalidade":1,"janelaDias":1}',
  "cobertoAte" = NULL, ciclos = 0, habilitada = true, "proximaEm" = now(),
  falhas = 0, "ultimoErro" = NULL, "reservaAte" = NULL, "reservadoPor" = NULL
WHERE id = 'pca-historico' AND NOT habilitada
  AND "ultimoErro" = 'Cobertura PCA em revisão: correção do limite final da consulta e reprocessamento histórico pendentes'
  AND ("reservaAte" IS NULL OR "reservaAte" < now())
RETURNING id, cursor, habilitada;
UPDATE gov_coletas SET
  cursor = jsonb_build_object('dia', to_char((now() AT TIME ZONE 'UTC')::date - 7, 'YYYY-MM-DD'), 'pagina', 1, 'modalidade', 1),
  "cobertoAte" = NULL, ciclos = 0, habilitada = true, "proximaEm" = now(),
  falhas = 0, "ultimoErro" = NULL, "reservaAte" = NULL, "reservadoPor" = NULL
WHERE id = 'pca-recentes' AND NOT habilitada
  AND "ultimoErro" = 'Cobertura PCA em revisão: correção do limite final da consulta e reprocessamento histórico pendentes'
  AND ("reservaAte" IS NULL OR "reservaAte" < now())
RETURNING id, cursor, habilitada;
UPDATE gov_coletas SET
  cursor = '{"dia":"2021-01-01","pagina":1,"modalidade":1}',
  "cobertoAte" = NULL, ciclos = 0, habilitada = true, "proximaEm" = now(),
  falhas = 0, "ultimoErro" = NULL, "reservaAte" = NULL, "reservadoPor" = NULL
WHERE id = 'compras-historico' AND NOT habilitada
  AND "ultimoErro" = 'Cobertura Compras em revisão: correção do limite final da consulta e reprocessamento histórico pendentes'
  AND ("reservaAte" IS NULL OR "reservaAte" < now())
RETURNING id, cursor, habilitada;
UPDATE gov_coletas SET
  cursor = jsonb_build_object('dia', to_char((now() AT TIME ZONE 'UTC')::date - 7, 'YYYY-MM-DD'), 'pagina', 1, 'modalidade', 1),
  "cobertoAte" = NULL, ciclos = 0, habilitada = true, "proximaEm" = now(),
  falhas = 0, "ultimoErro" = NULL, "reservaAte" = NULL, "reservadoPor" = NULL
WHERE id = 'compras-recentes' AND NOT habilitada
  AND "ultimoErro" = 'Cobertura Compras em revisão: correção do limite final da consulta e reprocessamento histórico pendentes'
  AND ("reservaAte" IS NULL OR "reservaAte" < now())
RETURNING id, cursor, habilitada;
COMMIT;
