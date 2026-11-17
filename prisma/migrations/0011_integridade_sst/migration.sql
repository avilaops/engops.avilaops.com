CREATE UNIQUE INDEX IF NOT EXISTS "clientes_id_empresaId_key" ON "clientes"("id", "empresaId");

ALTER TABLE "rh_setores" DROP CONSTRAINT IF EXISTS "rh_setores_clienteId_fkey", DROP CONSTRAINT IF EXISTS "rh_setores_clienteId_empresaId_fkey";
ALTER TABLE "rh_cargos" DROP CONSTRAINT IF EXISTS "rh_cargos_clienteId_fkey", DROP CONSTRAINT IF EXISTS "rh_cargos_clienteId_empresaId_fkey";
ALTER TABLE "rh_funcionarios" DROP CONSTRAINT IF EXISTS "rh_funcionarios_clienteId_fkey", DROP CONSTRAINT IF EXISTS "rh_funcionarios_clienteId_empresaId_fkey";
ALTER TABLE "sst_treinamentos" DROP CONSTRAINT IF EXISTS "sst_treinamentos_clienteId_fkey", DROP CONSTRAINT IF EXISTS "sst_treinamentos_clienteId_empresaId_fkey";
ALTER TABLE "sst_participantes" DROP CONSTRAINT IF EXISTS "sst_participantes_clienteId_fkey", DROP CONSTRAINT IF EXISTS "sst_participantes_clienteId_empresaId_fkey";
ALTER TABLE "sst_certificados" DROP CONSTRAINT IF EXISTS "sst_certificados_clienteId_fkey", DROP CONSTRAINT IF EXISTS "sst_certificados_clienteId_empresaId_fkey";
ALTER TABLE "sst_ordens_servico" DROP CONSTRAINT IF EXISTS "sst_ordens_servico_clienteId_fkey", DROP CONSTRAINT IF EXISTS "sst_ordens_servico_clienteId_empresaId_fkey";
ALTER TABLE "agenda_compromissos" DROP CONSTRAINT IF EXISTS "agenda_compromissos_clienteId_fkey", DROP CONSTRAINT IF EXISTS "agenda_compromissos_clienteId_empresaId_fkey";

ALTER TABLE "rh_setores" ADD CONSTRAINT "rh_setores_clienteId_empresaId_fkey" FOREIGN KEY ("clienteId", "empresaId") REFERENCES "clientes"("id", "empresaId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "rh_cargos" ADD CONSTRAINT "rh_cargos_clienteId_empresaId_fkey" FOREIGN KEY ("clienteId", "empresaId") REFERENCES "clientes"("id", "empresaId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "rh_funcionarios" ADD CONSTRAINT "rh_funcionarios_clienteId_empresaId_fkey" FOREIGN KEY ("clienteId", "empresaId") REFERENCES "clientes"("id", "empresaId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sst_treinamentos" ADD CONSTRAINT "sst_treinamentos_clienteId_empresaId_fkey" FOREIGN KEY ("clienteId", "empresaId") REFERENCES "clientes"("id", "empresaId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sst_participantes" ADD CONSTRAINT "sst_participantes_clienteId_empresaId_fkey" FOREIGN KEY ("clienteId", "empresaId") REFERENCES "clientes"("id", "empresaId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sst_certificados" ADD CONSTRAINT "sst_certificados_clienteId_empresaId_fkey" FOREIGN KEY ("clienteId", "empresaId") REFERENCES "clientes"("id", "empresaId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sst_ordens_servico" ADD CONSTRAINT "sst_ordens_servico_clienteId_empresaId_fkey" FOREIGN KEY ("clienteId", "empresaId") REFERENCES "clientes"("id", "empresaId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "agenda_compromissos" ADD CONSTRAINT "agenda_compromissos_clienteId_empresaId_fkey" FOREIGN KEY ("clienteId", "empresaId") REFERENCES "clientes"("id", "empresaId") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "sst_certificados" ADD COLUMN IF NOT EXISTS "versao" INTEGER NOT NULL DEFAULT 1;
CREATE TABLE "sst_certificados_emissoes" (
  "id" TEXT NOT NULL,
  "empresaId" TEXT NOT NULL,
  "clienteId" TEXT NOT NULL,
  "participanteId" TEXT NOT NULL,
  "numero" TEXT NOT NULL,
  "versao" INTEGER NOT NULL,
  "emitidoEm" TIMESTAMP(3) NOT NULL,
  "venceEm" TIMESTAMP(3),
  "arquivoChave" TEXT NOT NULL,
  "status" "StatusCertificadoSst" NOT NULL DEFAULT 'ATIVO',
  "invalidadoEm" TIMESTAMP(3),
  "motivoInvalidacao" TEXT,
  CONSTRAINT "sst_certificados_emissoes_pkey" PRIMARY KEY ("id")
);
INSERT INTO "sst_certificados_emissoes" ("id","empresaId","clienteId","participanteId","numero","versao","emitidoEm","venceEm","arquivoChave","status","invalidadoEm","motivoInvalidacao")
SELECT 'historico-' || "id", "empresaId", "clienteId", "participanteId", "numero", 1, "emitidoEm", "venceEm", "arquivoChave", "status", "invalidadoEm", "motivoInvalidacao" FROM "sst_certificados" WHERE "arquivoChave" IS NOT NULL
ON CONFLICT DO NOTHING;
CREATE UNIQUE INDEX "sst_certificados_emissoes_participanteId_versao_key" ON "sst_certificados_emissoes"("participanteId", "versao");
CREATE INDEX "sst_certificados_emissoes_empresaId_clienteId_emitidoEm_idx" ON "sst_certificados_emissoes"("empresaId", "clienteId", "emitidoEm");
ALTER TABLE "sst_certificados_emissoes" ADD CONSTRAINT "sst_certificados_emissoes_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sst_certificados_emissoes" ADD CONSTRAINT "sst_certificados_emissoes_clienteId_empresaId_fkey" FOREIGN KEY ("clienteId", "empresaId") REFERENCES "clientes"("id", "empresaId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sst_certificados_emissoes" ADD CONSTRAINT "sst_certificados_emissoes_participanteId_fkey" FOREIGN KEY ("participanteId") REFERENCES "sst_participantes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS "rh_setores_id_empresaId_clienteId_key" ON "rh_setores"("id", "empresaId", "clienteId");
CREATE UNIQUE INDEX IF NOT EXISTS "rh_cargos_id_empresaId_clienteId_key" ON "rh_cargos"("id", "empresaId", "clienteId");
CREATE UNIQUE INDEX IF NOT EXISTS "rh_funcionarios_id_empresaId_clienteId_key" ON "rh_funcionarios"("id", "empresaId", "clienteId");
CREATE UNIQUE INDEX IF NOT EXISTS "sst_treinamentos_id_empresaId_clienteId_key" ON "sst_treinamentos"("id", "empresaId", "clienteId");
CREATE UNIQUE INDEX IF NOT EXISTS "sst_participantes_id_empresaId_clienteId_key" ON "sst_participantes"("id", "empresaId", "clienteId");
CREATE UNIQUE INDEX IF NOT EXISTS "sst_certificados_participanteId_empresaId_clienteId_key" ON "sst_certificados"("participanteId", "empresaId", "clienteId");

ALTER TABLE "rh_funcionarios" DROP CONSTRAINT IF EXISTS "rh_funcionarios_setorId_fkey", DROP CONSTRAINT IF EXISTS "rh_funcionarios_cargoId_fkey";
ALTER TABLE "sst_participantes" DROP CONSTRAINT IF EXISTS "sst_participantes_treinamentoId_fkey", DROP CONSTRAINT IF EXISTS "sst_participantes_funcionarioId_fkey";
ALTER TABLE "sst_certificados" DROP CONSTRAINT IF EXISTS "sst_certificados_participanteId_fkey";
ALTER TABLE "sst_certificados_emissoes" DROP CONSTRAINT IF EXISTS "sst_certificados_emissoes_participanteId_fkey";
ALTER TABLE "sst_ordens_servico" DROP CONSTRAINT IF EXISTS "sst_ordens_servico_funcionarioId_fkey";

ALTER TABLE "rh_funcionarios" ADD CONSTRAINT "rh_funcionarios_setor_escopo_fkey" FOREIGN KEY ("setorId", "empresaId", "clienteId") REFERENCES "rh_setores"("id", "empresaId", "clienteId") ON UPDATE CASCADE;
ALTER TABLE "rh_funcionarios" ADD CONSTRAINT "rh_funcionarios_cargo_escopo_fkey" FOREIGN KEY ("cargoId", "empresaId", "clienteId") REFERENCES "rh_cargos"("id", "empresaId", "clienteId") ON UPDATE CASCADE;
ALTER TABLE "sst_participantes" ADD CONSTRAINT "sst_participantes_treinamento_escopo_fkey" FOREIGN KEY ("treinamentoId", "empresaId", "clienteId") REFERENCES "sst_treinamentos"("id", "empresaId", "clienteId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sst_participantes" ADD CONSTRAINT "sst_participantes_funcionario_escopo_fkey" FOREIGN KEY ("funcionarioId", "empresaId", "clienteId") REFERENCES "rh_funcionarios"("id", "empresaId", "clienteId") ON UPDATE CASCADE;
ALTER TABLE "sst_certificados" ADD CONSTRAINT "sst_certificados_participante_escopo_fkey" FOREIGN KEY ("participanteId", "empresaId", "clienteId") REFERENCES "sst_participantes"("id", "empresaId", "clienteId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sst_certificados_emissoes" ADD CONSTRAINT "sst_certificados_emissoes_participante_escopo_fkey" FOREIGN KEY ("participanteId", "empresaId", "clienteId") REFERENCES "sst_participantes"("id", "empresaId", "clienteId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sst_ordens_servico" ADD CONSTRAINT "sst_ordens_servico_funcionario_escopo_fkey" FOREIGN KEY ("funcionarioId", "empresaId", "clienteId") REFERENCES "rh_funcionarios"("id", "empresaId", "clienteId") ON UPDATE CASCADE;
