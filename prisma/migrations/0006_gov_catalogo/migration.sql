BEGIN;
-- AlterTable
ALTER TABLE "gov_oportunidades_salvas" ADD COLUMN     "erroConferencia" TEXT,
ADD COLUMN     "proximaConferenciaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "registroId" TEXT,
ADD COLUMN     "revisaoVista" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "gov_registros" (
    "id" TEXT NOT NULL,
    "externoId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "fontes" TEXT[],
    "objeto" TEXT NOT NULL,
    "orgao" TEXT NOT NULL,
    "cnpj" TEXT,
    "uf" TEXT,
    "regiao" TEXT,
    "categoria" TEXT,
    "modalidade" TEXT,
    "poder" TEXT,
    "esfera" TEXT,
    "valor" DECIMAL(20,2),
    "publicado" TIMESTAMP(3),
    "prazo" TIMESTAMP(3),
    "atualizadoFonte" TIMESTAMP(3),
    "dados" JSONB NOT NULL,
    "busca" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "revisao" INTEGER NOT NULL DEFAULT 1,
    "primeiroVistoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "conferidoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "proximaVerificacaoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "erroConferencia" TEXT,

    CONSTRAINT "gov_registros_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gov_coletas" (
    "id" TEXT NOT NULL,
    "fonte" TEXT NOT NULL,
    "historica" BOOLEAN NOT NULL DEFAULT false,
    "inicio" TIMESTAMP(3) NOT NULL,
    "cursor" JSONB NOT NULL,
    "habilitada" BOOLEAN NOT NULL DEFAULT false,
    "proximaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reservaAte" TIMESTAMP(3),
    "reservadoPor" TEXT,
    "paginas" INTEGER NOT NULL DEFAULT 0,
    "registros" INTEGER NOT NULL DEFAULT 0,
    "falhas" INTEGER NOT NULL DEFAULT 0,
    "ultimoErro" TEXT,
    "ultimoSucessoEm" TIMESTAMP(3),
    "cobertoAte" TIMESTAMP(3),
    "ciclos" INTEGER NOT NULL DEFAULT 0,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gov_coletas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gov_regras_alerta" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "filtros" JSONB NOT NULL,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gov_regras_alerta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gov_avisos" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "registroId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gov_avisos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "gov_registros_publicado_id_idx" ON "gov_registros"("publicado", "id");

-- CreateIndex
CREATE INDEX "gov_registros_prazo_idx" ON "gov_registros"("prazo");

-- CreateIndex
CREATE INDEX "gov_registros_uf_publicado_idx" ON "gov_registros"("uf", "publicado");

-- CreateIndex
CREATE INDEX "gov_registros_cnpj_publicado_idx" ON "gov_registros"("cnpj", "publicado");

-- CreateIndex
CREATE INDEX "gov_registros_tipo_publicado_idx" ON "gov_registros"("tipo", "publicado");

-- CreateIndex
CREATE INDEX "gov_registros_regiao_publicado_idx" ON "gov_registros"("regiao", "publicado");

-- CreateIndex
CREATE INDEX "gov_registros_categoria_idx" ON "gov_registros"("categoria");

-- CreateIndex
CREATE INDEX "gov_registros_conferidoEm_idx" ON "gov_registros"("conferidoEm");

-- CreateIndex
CREATE INDEX "gov_registros_proximaVerificacaoEm_idx" ON "gov_registros"("proximaVerificacaoEm");

-- CreateIndex
CREATE INDEX "gov_coletas_habilitada_proximaEm_reservaAte_idx" ON "gov_coletas"("habilitada", "proximaEm", "reservaAte");

-- CreateIndex
CREATE INDEX "gov_regras_alerta_empresaId_email_ativa_idx" ON "gov_regras_alerta"("empresaId", "email", "ativa");

-- CreateIndex
CREATE INDEX "gov_avisos_empresaId_criadoEm_idx" ON "gov_avisos"("empresaId", "criadoEm");

-- CreateIndex
CREATE INDEX "gov_oportunidades_salvas_registroId_idx" ON "gov_oportunidades_salvas"("registroId");

-- CreateIndex
CREATE INDEX "gov_oportunidades_salvas_proximaConferenciaEm_idx" ON "gov_oportunidades_salvas"("proximaConferenciaEm");

-- AddForeignKey
ALTER TABLE "gov_oportunidades_salvas" ADD CONSTRAINT "gov_oportunidades_salvas_registroId_fkey" FOREIGN KEY ("registroId") REFERENCES "gov_registros"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gov_regras_alerta" ADD CONSTRAINT "gov_regras_alerta_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gov_avisos" ADD CONSTRAINT "gov_avisos_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "gov_registros_busca_fts_idx" ON "gov_registros" USING GIN (to_tsvector('portuguese', busca));
CREATE INDEX "gov_oportunidades_salvas_externoId_fonte_idx" ON "gov_oportunidades_salvas"("externoId", "fonte");
COMMIT;
