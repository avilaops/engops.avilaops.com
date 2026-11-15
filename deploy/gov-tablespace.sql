-- Executar como administrador PostgreSQL, após criar o diretório do volume.
-- Não move tabelas de outros módulos nem credenciais de aplicação.
\set ON_ERROR_STOP on
SELECT format('CREATE TABLESPACE engops_gov OWNER %I LOCATION %L', pg_get_userbyid(datdba), '/mnt/HC_Volume_106542212/postgres-tablespaces/engops-gov')
FROM pg_database WHERE datname = current_database()
AND NOT EXISTS (SELECT 1 FROM pg_tablespace WHERE spcname = 'engops_gov')
\gexec
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tablespace WHERE spcname = 'engops_gov' AND pg_tablespace_location(oid) = '/mnt/HC_Volume_106542212/postgres-tablespaces/engops-gov') THEN
    RAISE EXCEPTION 'Tablespace de catálogo tem localização inesperada';
  END IF;
END $$;
ALTER TABLE gov_registros SET TABLESPACE engops_gov;
SELECT format('ALTER INDEX %I.%I SET TABLESPACE engops_gov', n.nspname, c.relname)
FROM pg_index i JOIN pg_class c ON c.oid = i.indexrelid JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE i.indrelid = 'gov_registros'::regclass
\gexec
-- Habilitar somente quando o volume também estiver montado no container.
-- UPDATE gov_coletas SET habilitada = true;
