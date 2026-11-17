CREATE TYPE "StatusEnvioEmailSst" AS ENUM ('PENDENTE', 'PROCESSANDO', 'ENVIADO', 'FALHOU');

CREATE TABLE "sst_envios_email" (
  "id" TEXT NOT NULL,
  "empresaId" TEXT NOT NULL,
  "certificadoId" TEXT NOT NULL,
  "chave" TEXT NOT NULL,
  "para" TEXT NOT NULL,
  "status" "StatusEnvioEmailSst" NOT NULL DEFAULT 'PENDENTE',
  "tentativas" INTEGER NOT NULL DEFAULT 0,
  "proximaTentativa" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "enviadoEm" TIMESTAMP(3),
  "erro" TEXT,
  "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizadoEm" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "sst_envios_email_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "sst_envios_email_chave_key" ON "sst_envios_email"("chave");
CREATE INDEX "sst_envios_email_status_proximaTentativa_idx" ON "sst_envios_email"("status", "proximaTentativa");
CREATE INDEX "sst_envios_email_empresaId_criadoEm_idx" ON "sst_envios_email"("empresaId", "criadoEm");
ALTER TABLE "sst_envios_email" ADD CONSTRAINT "sst_envios_email_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sst_envios_email" ADD CONSTRAINT "sst_envios_email_certificadoId_fkey" FOREIGN KEY ("certificadoId") REFERENCES "sst_certificados"("id") ON DELETE CASCADE ON UPDATE CASCADE;
