BEGIN;
CREATE TABLE "gov_oportunidades_salvas" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "empresaId" TEXT NOT NULL REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "fonte" TEXT NOT NULL CHECK ("fonte" IN ('PNCP', 'COMPRAS')),
  "externoId" TEXT NOT NULL,
  "dados" JSONB NOT NULL,
  "notas" TEXT NOT NULL DEFAULT '',
  "situacao" TEXT NOT NULL DEFAULT 'SALVA' CHECK ("situacao" IN ('SALVA', 'EM_ANALISE', 'INTERESSE', 'DESCARTADA')),
  "salvoPor" TEXT NOT NULL,
  "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizadoEm" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "gov_oportunidades_salvas_empresaId_fonte_externoId_key" ON "gov_oportunidades_salvas" ("empresaId", "fonte", "externoId");
CREATE INDEX "gov_oportunidades_salvas_empresaId_atualizadoEm_idx" ON "gov_oportunidades_salvas" ("empresaId", "atualizadoEm");
COMMIT;
