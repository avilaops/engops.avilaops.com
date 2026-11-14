-- Executar as preparações na sessão SQL e fornecer a empresa autenticada.
-- $1 não pode ser obtido de um filtro livre enviado por outro tenant.
PREPARE siop_configuracao(text, "AmbienteSiop") AS
 SELECT "ambiente", "usuario", "email", "perfil", "senhaEnvRef", "habilitada"
 FROM "siop_credenciais" WHERE "empresaId" = $1 AND "ambiente" = $2;

PREPARE siop_historico(text, "AmbienteSiop", integer, integer) AS
 SELECT c.*, r."sucesso", r."mensagensErro"
 FROM "siop_consultas" c LEFT JOIN "siop_retornos" r ON r."consultaId" = c."id" AND r."empresaId" = c."empresaId"
 WHERE c."empresaId" = $1 AND c."ambiente" = $2 AND ($3 IS NULL OR c."anoExercicio" = $3)
 ORDER BY c."criadoEm" DESC, c."id" DESC LIMIT 50 OFFSET $4;

PREPARE siop_retorno(text, text) AS
 SELECT r.* FROM "siop_retornos" r JOIN "siop_consultas" c ON c."id" = r."consultaId" AND c."empresaId" = r."empresaId"
 WHERE r."empresaId" = $1 AND c."id" = $2;

PREPARE siop_registros(text, text, integer) AS
 SELECT e.* FROM "siop_execucoes_orcamentarias_pac" e
 JOIN "siop_retornos" r ON r."id" = e."retornoId" AND r."empresaId" = e."empresaId"
 WHERE e."empresaId" = $1 AND r."consultaId" = $2
 ORDER BY e."ordem" ASC LIMIT 100 OFFSET $3;

PREPARE siop_totais(text, text) AS
 SELECT * FROM "siop_totais_por_consulta" WHERE "empresaId" = $1 AND "consultaId" = $2 AND "sucesso" = true;
