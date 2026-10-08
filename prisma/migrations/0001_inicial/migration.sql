-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "ModoAutomacao" AS ENUM ('SOMBRA', 'REAL');

-- CreateEnum
CREATE TYPE "PapelMembro" AS ENUM ('ADMIN', 'GESTOR', 'OPERADOR', 'REVISOR', 'CONSULTA');

-- CreateEnum
CREATE TYPE "TipoServico" AS ENUM ('AVALIACAO_IMOVEL', 'ACOMPANHAMENTO_OBRA', 'VISTORIA', 'LAUDO_TECNICO', 'OUTRO');

-- CreateEnum
CREATE TYPE "StatusDemanda" AS ENUM ('NOVA', 'EM_PREPARACAO', 'AGUARDANDO_DOCUMENTOS', 'PRONTA_PARA_PROCESSAMENTO', 'EM_PROCESSAMENTO', 'SIMIL_PENDENTE', 'SIMIL_CONCLUIDO', 'RAE_PENDENTE', 'RAE_CONCLUIDO', 'SIOPI_PENDENTE', 'EM_CONFERENCIA', 'COM_DIVERGENCIA', 'PRONTA_PARA_ENTREGA', 'ENTREGUE', 'ARQUIVADA', 'ERRO');

-- CreateEnum
CREATE TYPE "Prioridade" AS ENUM ('BAIXA', 'NORMAL', 'ALTA', 'URGENTE');

-- CreateEnum
CREATE TYPE "CategoriaDocumento" AS ENUM ('ENTRADA', 'IMOVEL', 'PROPRIETARIO', 'LAUDOS', 'SIMIL', 'RAE', 'SIOPI', 'ENTREGA', 'AUDITORIA');

-- CreateEnum
CREATE TYPE "OrigemDocumento" AS ENUM ('UPLOAD', 'PORTAL', 'AUTOMACAO', 'EMAIL', 'IMPORTACAO');

-- CreateEnum
CREATE TYPE "GrupoChecklist" AS ENUM ('DOCUMENTOS', 'DADOS', 'SIMIL', 'RAE', 'SIOPI', 'ENTREGA');

-- CreateEnum
CREATE TYPE "EstadoItem" AS ENUM ('PENDENTE', 'OK', 'REVISAR', 'BLOQUEADO');

-- CreateEnum
CREATE TYPE "Severidade" AS ENUM ('BLOQUEIA', 'AVISO');

-- CreateEnum
CREATE TYPE "OrigemPendencia" AS ENUM ('DETECTOR', 'CRUZADO', 'AUTOMACAO', 'MANUAL');

-- CreateEnum
CREATE TYPE "StatusJob" AS ENUM ('QUEUED', 'RUNNING', 'WAITING_USER', 'RETRYING', 'SUCCESS', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "NivelEvento" AS ENUM ('INFO', 'AVISO', 'ERRO');

-- CreateEnum
CREATE TYPE "SistemaExterno" AS ENUM ('SIMIL', 'RAE', 'SIOPI');

-- CreateEnum
CREATE TYPE "StatusExecucao" AS ENUM ('PREPARADA', 'AGUARDANDO_APROVACAO', 'EXECUTANDO', 'CONCLUIDA', 'FALHOU', 'CANCELADA');

-- CreateEnum
CREATE TYPE "StatusAprovacao" AS ENUM ('PENDENTE', 'APROVADA', 'REJEITADA');

-- CreateTable
CREATE TABLE "empresas" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cnpj" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "modoAutomacao" "ModoAutomacao" NOT NULL DEFAULT 'SOMBRA',
    "proximoCodigo" INTEGER NOT NULL DEFAULT 1,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "empresas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membros" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "papel" "PapelMembro" NOT NULL DEFAULT 'OPERADOR',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ultimoAcessoEm" TIMESTAMP(3),

    CONSTRAINT "membros_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clientes" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "documento" TEXT,
    "email" TEXT,
    "telefone" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "demandas" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "numeroOs" TEXT,
    "tipoServico" "TipoServico" NOT NULL DEFAULT 'AVALIACAO_IMOVEL',
    "status" "StatusDemanda" NOT NULL DEFAULT 'NOVA',
    "prioridade" "Prioridade" NOT NULL DEFAULT 'NORMAL',
    "clienteId" TEXT,
    "responsavelId" TEXT,
    "dataEntrada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "prazo" TIMESTAMP(3),
    "observacoes" TEXT,
    "endereco" TEXT,
    "numero" TEXT,
    "complemento" TEXT,
    "bairro" TEXT,
    "municipio" TEXT,
    "uf" TEXT,
    "cep" TEXT,
    "matricula" TEXT,
    "cartorio" TEXT,
    "areaM2" DECIMAL(12,2),
    "tipoImovel" TEXT,
    "proprietarioNome" TEXT,
    "proprietarioDoc" TEXT,
    "valorAvaliacao" DECIMAL(14,2),
    "dataVistoria" TIMESTAMP(3),
    "arquivadaEm" TIMESTAMP(3),
    "entregueEm" TIMESTAMP(3),
    "criadoPor" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "demandas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documentos" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "demandaId" TEXT NOT NULL,
    "categoria" "CategoriaDocumento" NOT NULL,
    "tipo" TEXT NOT NULL,
    "nomeOriginal" TEXT NOT NULL,
    "nomeArquivo" TEXT NOT NULL,
    "chave" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "tamanho" INTEGER NOT NULL,
    "hash" TEXT NOT NULL,
    "versao" INTEGER NOT NULL DEFAULT 1,
    "origem" "OrigemDocumento" NOT NULL DEFAULT 'UPLOAD',
    "enviadoPor" TEXT NOT NULL,
    "dados" JSONB,
    "substituiId" TEXT,
    "removidoEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "itens_checklist" (
    "id" TEXT NOT NULL,
    "demandaId" TEXT NOT NULL,
    "grupo" "GrupoChecklist" NOT NULL,
    "chave" TEXT NOT NULL,
    "rotulo" TEXT NOT NULL,
    "estado" "EstadoItem" NOT NULL DEFAULT 'PENDENTE',
    "ordem" INTEGER NOT NULL,
    "detalhe" TEXT,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "itens_checklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pendencias" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "demandaId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "severidade" "Severidade" NOT NULL,
    "titulo" TEXT NOT NULL,
    "detalhe" TEXT,
    "campo" TEXT,
    "origem" "OrigemPendencia" NOT NULL DEFAULT 'DETECTOR',
    "resolvidaEm" TIMESTAMP(3),
    "resolvidaPor" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pendencias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobs" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "demandaId" TEXT,
    "workflow" TEXT NOT NULL,
    "status" "StatusJob" NOT NULL DEFAULT 'QUEUED',
    "modo" "ModoAutomacao" NOT NULL DEFAULT 'SOMBRA',
    "prioridade" INTEGER NOT NULL DEFAULT 5,
    "etapaAtual" INTEGER NOT NULL DEFAULT 0,
    "totalEtapas" INTEGER NOT NULL,
    "tentativas" INTEGER NOT NULL DEFAULT 0,
    "maxTentativas" INTEGER NOT NULL DEFAULT 3,
    "chaveIdempotencia" TEXT NOT NULL,
    "agendadoPara" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "travadoAte" TIMESTAMP(3),
    "travadoPor" TEXT,
    "iniciadoEm" TIMESTAMP(3),
    "terminadoEm" TIMESTAMP(3),
    "erroCodigo" TEXT,
    "erroMensagem" TEXT,
    "contexto" JSONB NOT NULL DEFAULT '{}',
    "resultado" JSONB,
    "criadoPor" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eventos_job" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "etapa" TEXT NOT NULL,
    "nivel" "NivelEvento" NOT NULL DEFAULT 'INFO',
    "mensagem" TEXT NOT NULL,
    "dados" JSONB,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "eventos_job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "execucoes_externas" (
    "id" TEXT NOT NULL,
    "demandaId" TEXT NOT NULL,
    "jobId" TEXT,
    "sistema" "SistemaExterno" NOT NULL,
    "modo" "ModoAutomacao" NOT NULL,
    "status" "StatusExecucao" NOT NULL DEFAULT 'PREPARADA',
    "dados" JSONB NOT NULL,
    "protocolo" TEXT,
    "evidencias" JSONB,
    "erroCodigo" TEXT,
    "erroMensagem" TEXT,
    "executadoPor" TEXT,
    "iniciadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "terminadoEm" TIMESTAMP(3),

    CONSTRAINT "execucoes_externas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "aprovacoes" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "demandaId" TEXT NOT NULL,
    "jobId" TEXT,
    "tipo" TEXT NOT NULL,
    "status" "StatusAprovacao" NOT NULL DEFAULT 'PENDENTE',
    "resumo" JSONB NOT NULL,
    "solicitadaPor" TEXT NOT NULL,
    "solicitadaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decididaPor" TEXT,
    "decididaEm" TIMESTAMP(3),
    "motivo" TEXT,

    CONSTRAINT "aprovacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auditoria" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "usuario" TEXT NOT NULL,
    "acao" TEXT NOT NULL,
    "objetoTipo" TEXT NOT NULL,
    "objetoId" TEXT NOT NULL,
    "antes" JSONB,
    "depois" JSONB,
    "origem" TEXT NOT NULL DEFAULT 'ui',
    "metadados" JSONB,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eventos_dominio" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "entregueEm" TIMESTAMP(3),
    "tentativas" INTEGER NOT NULL DEFAULT 0,
    "erro" TEXT,

    CONSTRAINT "eventos_dominio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notificacoes" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "destinatario" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "corpo" TEXT,
    "link" TEXT,
    "lidaEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificacoes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "empresas_slug_key" ON "empresas"("slug");

-- CreateIndex
CREATE INDEX "membros_email_idx" ON "membros"("email");

-- CreateIndex
CREATE UNIQUE INDEX "membros_empresaId_email_key" ON "membros"("empresaId", "email");

-- CreateIndex
CREATE INDEX "clientes_empresaId_nome_idx" ON "clientes"("empresaId", "nome");

-- CreateIndex
CREATE INDEX "demandas_empresaId_status_idx" ON "demandas"("empresaId", "status");

-- CreateIndex
CREATE INDEX "demandas_empresaId_prazo_idx" ON "demandas"("empresaId", "prazo");

-- CreateIndex
CREATE INDEX "demandas_empresaId_responsavelId_idx" ON "demandas"("empresaId", "responsavelId");

-- CreateIndex
CREATE INDEX "demandas_empresaId_numeroOs_idx" ON "demandas"("empresaId", "numeroOs");

-- CreateIndex
CREATE UNIQUE INDEX "demandas_empresaId_codigo_key" ON "demandas"("empresaId", "codigo");

-- CreateIndex
CREATE INDEX "documentos_demandaId_categoria_idx" ON "documentos"("demandaId", "categoria");

-- CreateIndex
CREATE INDEX "documentos_empresaId_hash_idx" ON "documentos"("empresaId", "hash");

-- CreateIndex
CREATE UNIQUE INDEX "itens_checklist_demandaId_chave_key" ON "itens_checklist"("demandaId", "chave");

-- CreateIndex
CREATE INDEX "pendencias_demandaId_resolvidaEm_idx" ON "pendencias"("demandaId", "resolvidaEm");

-- CreateIndex
CREATE INDEX "pendencias_empresaId_resolvidaEm_idx" ON "pendencias"("empresaId", "resolvidaEm");

-- CreateIndex
CREATE UNIQUE INDEX "jobs_chaveIdempotencia_key" ON "jobs"("chaveIdempotencia");

-- CreateIndex
CREATE INDEX "jobs_status_agendadoPara_prioridade_idx" ON "jobs"("status", "agendadoPara", "prioridade");

-- CreateIndex
CREATE INDEX "jobs_empresaId_status_idx" ON "jobs"("empresaId", "status");

-- CreateIndex
CREATE INDEX "jobs_demandaId_idx" ON "jobs"("demandaId");

-- CreateIndex
CREATE INDEX "eventos_job_jobId_criadoEm_idx" ON "eventos_job"("jobId", "criadoEm");

-- CreateIndex
CREATE INDEX "execucoes_externas_demandaId_sistema_idx" ON "execucoes_externas"("demandaId", "sistema");

-- CreateIndex
CREATE INDEX "aprovacoes_empresaId_status_idx" ON "aprovacoes"("empresaId", "status");

-- CreateIndex
CREATE INDEX "aprovacoes_demandaId_status_idx" ON "aprovacoes"("demandaId", "status");

-- CreateIndex
CREATE INDEX "auditoria_empresaId_criadoEm_idx" ON "auditoria"("empresaId", "criadoEm");

-- CreateIndex
CREATE INDEX "auditoria_objetoTipo_objetoId_idx" ON "auditoria"("objetoTipo", "objetoId");

-- CreateIndex
CREATE INDEX "eventos_dominio_entregueEm_criadoEm_idx" ON "eventos_dominio"("entregueEm", "criadoEm");

-- CreateIndex
CREATE INDEX "notificacoes_destinatario_lidaEm_idx" ON "notificacoes"("destinatario", "lidaEm");

-- AddForeignKey
ALTER TABLE "membros" ADD CONSTRAINT "membros_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demandas" ADD CONSTRAINT "demandas_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demandas" ADD CONSTRAINT "demandas_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demandas" ADD CONSTRAINT "demandas_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "membros"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_demandaId_fkey" FOREIGN KEY ("demandaId") REFERENCES "demandas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_checklist" ADD CONSTRAINT "itens_checklist_demandaId_fkey" FOREIGN KEY ("demandaId") REFERENCES "demandas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pendencias" ADD CONSTRAINT "pendencias_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pendencias" ADD CONSTRAINT "pendencias_demandaId_fkey" FOREIGN KEY ("demandaId") REFERENCES "demandas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_demandaId_fkey" FOREIGN KEY ("demandaId") REFERENCES "demandas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eventos_job" ADD CONSTRAINT "eventos_job_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "execucoes_externas" ADD CONSTRAINT "execucoes_externas_demandaId_fkey" FOREIGN KEY ("demandaId") REFERENCES "demandas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "execucoes_externas" ADD CONSTRAINT "execucoes_externas_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aprovacoes" ADD CONSTRAINT "aprovacoes_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aprovacoes" ADD CONSTRAINT "aprovacoes_demandaId_fkey" FOREIGN KEY ("demandaId") REFERENCES "demandas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aprovacoes" ADD CONSTRAINT "aprovacoes_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditoria" ADD CONSTRAINT "auditoria_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eventos_dominio" ADD CONSTRAINT "eventos_dominio_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificacoes" ADD CONSTRAINT "notificacoes_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

