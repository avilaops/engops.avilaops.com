ALTER TABLE "rh_setores" ADD COLUMN "clienteId" TEXT;
ALTER TABLE "rh_cargos" ADD COLUMN "clienteId" TEXT;
ALTER TABLE "rh_funcionarios" ADD COLUMN "clienteId" TEXT;
ALTER TABLE "sst_treinamentos" ADD COLUMN "clienteId" TEXT;
ALTER TABLE "sst_participantes" ADD COLUMN "clienteId" TEXT;
ALTER TABLE "sst_certificados" ADD COLUMN "clienteId" TEXT;
ALTER TABLE "sst_ordens_servico" ADD COLUMN "clienteId" TEXT;
ALTER TABLE "agenda_compromissos" ADD COLUMN "clienteId" TEXT;
ALTER TABLE "clientes" ADD COLUMN "logoChave" TEXT;
CREATE TYPE "StatusCertificadoSst" AS ENUM ('ATIVO', 'INVALIDADO');
ALTER TABLE "sst_certificados" ADD COLUMN "status" "StatusCertificadoSst" NOT NULL DEFAULT 'ATIVO', ADD COLUMN "invalidadoEm" TIMESTAMP(3), ADD COLUMN "motivoInvalidacao" TEXT;
ALTER TABLE "notificacoes" ADD COLUMN "chave" TEXT;
CREATE UNIQUE INDEX "notificacoes_chave_key" ON "notificacoes"("chave");

-- Preserva cadastros anteriores ao escopo por cliente em uma empresa cliente
-- explícita. O identificador determinístico torna a migration repetível em
-- cópias restauradas do banco.
INSERT INTO "clientes" ("id", "empresaId", "nome", "criadoEm")
SELECT 'rh-legado-' || md5(origem."empresaId"), origem."empresaId", 'Dados anteriores • RH e SST', CURRENT_TIMESTAMP
FROM (
  SELECT "empresaId" FROM "rh_setores" UNION
  SELECT "empresaId" FROM "rh_cargos" UNION
  SELECT "empresaId" FROM "rh_funcionarios" UNION
  SELECT "empresaId" FROM "sst_treinamentos" UNION
  SELECT "empresaId" FROM "sst_participantes" UNION
  SELECT "empresaId" FROM "sst_certificados" UNION
  SELECT "empresaId" FROM "sst_ordens_servico" UNION
  SELECT "empresaId" FROM "agenda_compromissos"
) origem
ON CONFLICT ("id") DO NOTHING;

UPDATE "rh_setores" SET "clienteId" = 'rh-legado-' || md5("empresaId") WHERE "clienteId" IS NULL;
UPDATE "rh_cargos" SET "clienteId" = 'rh-legado-' || md5("empresaId") WHERE "clienteId" IS NULL;
UPDATE "rh_funcionarios" SET "clienteId" = 'rh-legado-' || md5("empresaId") WHERE "clienteId" IS NULL;
UPDATE "sst_treinamentos" SET "clienteId" = 'rh-legado-' || md5("empresaId") WHERE "clienteId" IS NULL;
UPDATE "sst_participantes" SET "clienteId" = 'rh-legado-' || md5("empresaId") WHERE "clienteId" IS NULL;
UPDATE "sst_certificados" SET "clienteId" = 'rh-legado-' || md5("empresaId") WHERE "clienteId" IS NULL;
UPDATE "sst_ordens_servico" SET "clienteId" = 'rh-legado-' || md5("empresaId") WHERE "clienteId" IS NULL;
UPDATE "agenda_compromissos" SET "clienteId" = 'rh-legado-' || md5("empresaId") WHERE "clienteId" IS NULL;

ALTER TABLE "rh_setores" ALTER COLUMN "clienteId" SET NOT NULL;
ALTER TABLE "rh_cargos" ALTER COLUMN "clienteId" SET NOT NULL;
ALTER TABLE "rh_funcionarios" ALTER COLUMN "clienteId" SET NOT NULL;
ALTER TABLE "sst_treinamentos" ALTER COLUMN "clienteId" SET NOT NULL;
ALTER TABLE "sst_participantes" ALTER COLUMN "clienteId" SET NOT NULL;
ALTER TABLE "sst_certificados" ALTER COLUMN "clienteId" SET NOT NULL;
ALTER TABLE "sst_ordens_servico" ALTER COLUMN "clienteId" SET NOT NULL;
ALTER TABLE "agenda_compromissos" ALTER COLUMN "clienteId" SET NOT NULL;

CREATE UNIQUE INDEX "clientes_id_empresaId_key" ON "clientes"("id", "empresaId");

ALTER TABLE "rh_setores" ADD CONSTRAINT "rh_setores_clienteId_empresaId_fkey" FOREIGN KEY ("clienteId", "empresaId") REFERENCES "clientes"("id", "empresaId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "rh_cargos" ADD CONSTRAINT "rh_cargos_clienteId_empresaId_fkey" FOREIGN KEY ("clienteId", "empresaId") REFERENCES "clientes"("id", "empresaId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "rh_funcionarios" ADD CONSTRAINT "rh_funcionarios_clienteId_empresaId_fkey" FOREIGN KEY ("clienteId", "empresaId") REFERENCES "clientes"("id", "empresaId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sst_treinamentos" ADD CONSTRAINT "sst_treinamentos_clienteId_empresaId_fkey" FOREIGN KEY ("clienteId", "empresaId") REFERENCES "clientes"("id", "empresaId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sst_participantes" ADD CONSTRAINT "sst_participantes_clienteId_empresaId_fkey" FOREIGN KEY ("clienteId", "empresaId") REFERENCES "clientes"("id", "empresaId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sst_certificados" ADD CONSTRAINT "sst_certificados_clienteId_empresaId_fkey" FOREIGN KEY ("clienteId", "empresaId") REFERENCES "clientes"("id", "empresaId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sst_ordens_servico" ADD CONSTRAINT "sst_ordens_servico_clienteId_empresaId_fkey" FOREIGN KEY ("clienteId", "empresaId") REFERENCES "clientes"("id", "empresaId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "agenda_compromissos" ADD CONSTRAINT "agenda_compromissos_clienteId_empresaId_fkey" FOREIGN KEY ("clienteId", "empresaId") REFERENCES "clientes"("id", "empresaId") ON DELETE CASCADE ON UPDATE CASCADE;

DROP INDEX IF EXISTS "rh_setores_empresaId_nome_key";
DROP INDEX IF EXISTS "rh_cargos_empresaId_nome_key";
DROP INDEX IF EXISTS "rh_funcionarios_empresaId_cpf_key";
DROP INDEX IF EXISTS "sst_ordens_servico_empresaId_numero_key";
CREATE UNIQUE INDEX "rh_setores_empresaId_clienteId_nome_key" ON "rh_setores"("empresaId", "clienteId", "nome");
CREATE UNIQUE INDEX "rh_cargos_empresaId_clienteId_nome_key" ON "rh_cargos"("empresaId", "clienteId", "nome");
CREATE UNIQUE INDEX "rh_funcionarios_empresaId_clienteId_cpf_key" ON "rh_funcionarios"("empresaId", "clienteId", "cpf");
CREATE UNIQUE INDEX "sst_ordens_servico_empresaId_clienteId_numero_key" ON "sst_ordens_servico"("empresaId", "clienteId", "numero");
CREATE INDEX "rh_setores_empresaId_clienteId_ativo_idx" ON "rh_setores"("empresaId", "clienteId", "ativo");
CREATE INDEX "rh_cargos_empresaId_clienteId_ativo_idx" ON "rh_cargos"("empresaId", "clienteId", "ativo");
CREATE INDEX "rh_funcionarios_empresaId_clienteId_nome_idx" ON "rh_funcionarios"("empresaId", "clienteId", "nome");
CREATE INDEX "sst_treinamentos_empresaId_clienteId_inicio_idx" ON "sst_treinamentos"("empresaId", "clienteId", "inicio");
CREATE INDEX "sst_participantes_empresaId_clienteId_idx" ON "sst_participantes"("empresaId", "clienteId");
CREATE INDEX "sst_certificados_empresaId_clienteId_venceEm_idx" ON "sst_certificados"("empresaId", "clienteId", "venceEm");
CREATE INDEX "agenda_compromissos_empresaId_clienteId_inicio_idx" ON "agenda_compromissos"("empresaId", "clienteId", "inicio");
