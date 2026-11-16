ALTER TYPE "SistemaExterno" ADD VALUE 'BANCO_BRASIL';

CREATE TABLE "configuracoes_operacionais" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "sistema" "SistemaExterno" NOT NULL,
    "portalUrl" TEXT,
    "unidade" TEXT,
    "operacao" TEXT,
    "observacoes" TEXT,
    "atualizadoPor" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "configuracoes_operacionais_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "configuracoes_operacionais_empresaId_sistema_key" ON "configuracoes_operacionais"("empresaId", "sistema");
ALTER TABLE "configuracoes_operacionais" ADD CONSTRAINT "configuracoes_operacionais_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
