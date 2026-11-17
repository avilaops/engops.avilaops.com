-- CreateEnum
CREATE TYPE "ModuloEngOps" AS ENUM ('RH', 'SST');

-- CreateEnum
CREATE TYPE "StatusFuncionario" AS ENUM ('ATIVO', 'AFASTADO', 'DESLIGADO');

-- CreateEnum
CREATE TYPE "StatusTreinamento" AS ENUM ('PLANEJADO', 'REALIZADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "StatusOrdemSst" AS ENUM ('RASCUNHO', 'EMITIDA', 'ASSINADA', 'CANCELADA');

-- CreateTable
CREATE TABLE "modulos_empresa" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "modulo" "ModuloEngOps" NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "configuracao" JSONB,
    "ativadoPor" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "modulos_empresa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rh_setores" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rh_setores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rh_cargos" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cbo" TEXT,
    "descricao" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rh_cargos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rh_funcionarios" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "setorId" TEXT NOT NULL,
    "cargoId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "matricula" TEXT,
    "email" TEXT,
    "telefone" TEXT,
    "admissao" TIMESTAMP(3),
    "status" "StatusFuncionario" NOT NULL DEFAULT 'ATIVO',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rh_funcionarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sst_normas" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "textoReferencia" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sst_normas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sst_treinamentos" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "normaId" TEXT,
    "titulo" TEXT NOT NULL,
    "inicio" TIMESTAMP(3) NOT NULL,
    "fim" TIMESTAMP(3),
    "cargaHorariaMin" INTEGER,
    "instrutor" TEXT,
    "validadeMeses" INTEGER,
    "status" "StatusTreinamento" NOT NULL DEFAULT 'PLANEJADO',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sst_treinamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sst_participantes" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "treinamentoId" TEXT NOT NULL,
    "funcionarioId" TEXT NOT NULL,
    "presente" BOOLEAN NOT NULL DEFAULT false,
    "aprovado" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "sst_participantes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sst_certificados" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "participanteId" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "emitidoEm" TIMESTAMP(3) NOT NULL,
    "venceEm" TIMESTAMP(3),
    "arquivoChave" TEXT,

    CONSTRAINT "sst_certificados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sst_ordens_servico" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "funcionarioId" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "emitidaEm" TIMESTAMP(3) NOT NULL,
    "atividades" TEXT NOT NULL,
    "riscos" TEXT NOT NULL,
    "medidas" TEXT NOT NULL,
    "epis" TEXT,
    "status" "StatusOrdemSst" NOT NULL DEFAULT 'RASCUNHO',

    CONSTRAINT "sst_ordens_servico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agenda_compromissos" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "funcionarioId" TEXT,
    "titulo" TEXT NOT NULL,
    "inicio" TIMESTAMP(3) NOT NULL,
    "fim" TIMESTAMP(3),
    "diaInteiro" BOOLEAN NOT NULL DEFAULT false,
    "descricao" TEXT,
    "criadoPor" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agenda_compromissos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "modulos_empresa_empresaId_ativo_idx" ON "modulos_empresa"("empresaId", "ativo");

-- CreateIndex
CREATE UNIQUE INDEX "modulos_empresa_empresaId_modulo_key" ON "modulos_empresa"("empresaId", "modulo");

-- CreateIndex
CREATE UNIQUE INDEX "rh_setores_empresaId_nome_key" ON "rh_setores"("empresaId", "nome");

-- CreateIndex
CREATE UNIQUE INDEX "rh_cargos_empresaId_nome_key" ON "rh_cargos"("empresaId", "nome");

-- CreateIndex
CREATE INDEX "rh_funcionarios_empresaId_nome_idx" ON "rh_funcionarios"("empresaId", "nome");

-- CreateIndex
CREATE UNIQUE INDEX "rh_funcionarios_empresaId_cpf_key" ON "rh_funcionarios"("empresaId", "cpf");

-- CreateIndex
CREATE UNIQUE INDEX "sst_normas_empresaId_codigo_key" ON "sst_normas"("empresaId", "codigo");

-- CreateIndex
CREATE INDEX "sst_treinamentos_empresaId_inicio_idx" ON "sst_treinamentos"("empresaId", "inicio");

-- CreateIndex
CREATE INDEX "sst_participantes_empresaId_idx" ON "sst_participantes"("empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "sst_participantes_treinamentoId_funcionarioId_key" ON "sst_participantes"("treinamentoId", "funcionarioId");

-- CreateIndex
CREATE UNIQUE INDEX "sst_certificados_participanteId_key" ON "sst_certificados"("participanteId");

-- CreateIndex
CREATE INDEX "sst_certificados_empresaId_venceEm_idx" ON "sst_certificados"("empresaId", "venceEm");

-- CreateIndex
CREATE UNIQUE INDEX "sst_certificados_empresaId_numero_key" ON "sst_certificados"("empresaId", "numero");

-- CreateIndex
CREATE UNIQUE INDEX "sst_ordens_servico_empresaId_numero_key" ON "sst_ordens_servico"("empresaId", "numero");

-- CreateIndex
CREATE INDEX "agenda_compromissos_empresaId_inicio_idx" ON "agenda_compromissos"("empresaId", "inicio");

-- AddForeignKey
ALTER TABLE "modulos_empresa" ADD CONSTRAINT "modulos_empresa_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rh_setores" ADD CONSTRAINT "rh_setores_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rh_cargos" ADD CONSTRAINT "rh_cargos_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rh_funcionarios" ADD CONSTRAINT "rh_funcionarios_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rh_funcionarios" ADD CONSTRAINT "rh_funcionarios_setorId_fkey" FOREIGN KEY ("setorId") REFERENCES "rh_setores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rh_funcionarios" ADD CONSTRAINT "rh_funcionarios_cargoId_fkey" FOREIGN KEY ("cargoId") REFERENCES "rh_cargos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sst_normas" ADD CONSTRAINT "sst_normas_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sst_treinamentos" ADD CONSTRAINT "sst_treinamentos_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sst_treinamentos" ADD CONSTRAINT "sst_treinamentos_normaId_fkey" FOREIGN KEY ("normaId") REFERENCES "sst_normas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sst_participantes" ADD CONSTRAINT "sst_participantes_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sst_participantes" ADD CONSTRAINT "sst_participantes_treinamentoId_fkey" FOREIGN KEY ("treinamentoId") REFERENCES "sst_treinamentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sst_participantes" ADD CONSTRAINT "sst_participantes_funcionarioId_fkey" FOREIGN KEY ("funcionarioId") REFERENCES "rh_funcionarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sst_certificados" ADD CONSTRAINT "sst_certificados_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sst_certificados" ADD CONSTRAINT "sst_certificados_participanteId_fkey" FOREIGN KEY ("participanteId") REFERENCES "sst_participantes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sst_ordens_servico" ADD CONSTRAINT "sst_ordens_servico_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sst_ordens_servico" ADD CONSTRAINT "sst_ordens_servico_funcionarioId_fkey" FOREIGN KEY ("funcionarioId") REFERENCES "rh_funcionarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agenda_compromissos" ADD CONSTRAINT "agenda_compromissos_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agenda_compromissos" ADD CONSTRAINT "agenda_compromissos_funcionarioId_fkey" FOREIGN KEY ("funcionarioId") REFERENCES "rh_funcionarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
