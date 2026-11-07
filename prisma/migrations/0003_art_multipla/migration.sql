-- CreateTable
CREATE TABLE "arts_multiplas" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "documentoId" TEXT NOT NULL,
    "criadoPor" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "arts_multiplas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "itens_art_multipla" (
    "artId" TEXT NOT NULL,
    "demandaId" TEXT NOT NULL,

    CONSTRAINT "itens_art_multipla_pkey" PRIMARY KEY ("artId","demandaId")
);

-- CreateIndex
CREATE UNIQUE INDEX "arts_multiplas_documentoId_key" ON "arts_multiplas"("documentoId");

-- CreateIndex
CREATE UNIQUE INDEX "arts_multiplas_empresaId_numero_key" ON "arts_multiplas"("empresaId", "numero");

-- CreateIndex
CREATE INDEX "itens_art_multipla_demandaId_idx" ON "itens_art_multipla"("demandaId");

-- AddForeignKey
ALTER TABLE "arts_multiplas" ADD CONSTRAINT "arts_multiplas_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "arts_multiplas" ADD CONSTRAINT "arts_multiplas_documentoId_fkey" FOREIGN KEY ("documentoId") REFERENCES "documentos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_art_multipla" ADD CONSTRAINT "itens_art_multipla_artId_fkey" FOREIGN KEY ("artId") REFERENCES "arts_multiplas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_art_multipla" ADD CONSTRAINT "itens_art_multipla_demandaId_fkey" FOREIGN KEY ("demandaId") REFERENCES "demandas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

