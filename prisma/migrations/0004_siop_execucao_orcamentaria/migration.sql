-- Contrato: docs/contratos/WSExecucaoOrcamentaria.wsdl, homologação em 14/11/2026.
BEGIN;
CREATE TYPE "AmbienteSiop" AS ENUM ('HOMOLOGACAO', 'PRODUCAO');
CREATE TYPE "StatusConsultaSiop" AS ENUM ('PENDENTE', 'CONCLUIDA', 'RECUSADA', 'FALHOU');
CREATE TABLE "siop_credenciais" (
 "id" TEXT PRIMARY KEY, "empresaId" TEXT NOT NULL REFERENCES "empresas"("id") ON DELETE RESTRICT,
 "ambiente" "AmbienteSiop" NOT NULL DEFAULT 'HOMOLOGACAO', "usuario" TEXT, "email" TEXT, "perfil" INTEGER,
 "senhaEnvRef" TEXT, "habilitada" BOOLEAN NOT NULL DEFAULT false,
 "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "atualizadoEm" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "siop_credenciais_empresaId_ambiente_key" UNIQUE ("empresaId", "ambiente"),
 CONSTRAINT "siop_credenciais_id_empresaId_key" UNIQUE ("id", "empresaId")
);
CREATE TABLE "siop_consultas" (
 "id" TEXT PRIMARY KEY, "empresaId" TEXT NOT NULL REFERENCES "empresas"("id") ON DELETE RESTRICT,
 "credencialId" TEXT NOT NULL, "ambiente" "AmbienteSiop" NOT NULL, "anoExercicio" INTEGER NOT NULL,
 "operacao" TEXT NOT NULL DEFAULT 'consultarPac', "status" "StatusConsultaSiop" NOT NULL DEFAULT 'PENDENTE',
 "solicitadoPor" TEXT NOT NULL, "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "terminadoEm" TIMESTAMP(3), "erroCodigo" TEXT,
 CONSTRAINT "siop_consultas_id_empresaId_key" UNIQUE ("id", "empresaId"),
 CONSTRAINT "siop_consultas_credencialId_empresaId_fkey" FOREIGN KEY ("credencialId", "empresaId") REFERENCES "siop_credenciais"("id", "empresaId") ON DELETE RESTRICT
);
CREATE INDEX "siop_consultas_empresaId_ambiente_anoExercicio_criadoEm_idx" ON "siop_consultas"("empresaId", "ambiente", "anoExercicio", "criadoEm");
CREATE TABLE "siop_retornos" (
 "id" TEXT PRIMARY KEY, "empresaId" TEXT NOT NULL REFERENCES "empresas"("id") ON DELETE RESTRICT,
 "consultaId" TEXT NOT NULL UNIQUE, "sucesso" BOOLEAN NOT NULL, "mensagensErro" JSONB,
 "execucoesPresentes" BOOLEAN NOT NULL DEFAULT false, "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "siop_retornos_id_empresaId_key" UNIQUE ("id", "empresaId"),
 CONSTRAINT "siop_retornos_consultaId_empresaId_key" UNIQUE ("consultaId", "empresaId"),
 CONSTRAINT "siop_retornos_consultaId_empresaId_fkey" FOREIGN KEY ("consultaId", "empresaId") REFERENCES "siop_consultas"("id", "empresaId") ON DELETE RESTRICT
);
CREATE INDEX "siop_retornos_empresaId_criadoEm_idx" ON "siop_retornos"("empresaId", "criadoEm");
CREATE TABLE "siop_execucoes_orcamentarias_pac" (
 "id" TEXT PRIMARY KEY, "empresaId" TEXT NOT NULL REFERENCES "empresas"("id") ON DELETE RESTRICT,
 "retornoId" TEXT NOT NULL, "ordem" INTEGER NOT NULL,
 "acao" TEXT,
 "anoexercicio" INTEGER,
 "antecipado" DECIMAL(16,2),
 "autorizado" DECIMAL(16,2),
 "bloqueado_remanejamento_de_credito" DECIMAL(16,2),
 "bloqueado_rp2" DECIMAL(16,2),
 "bloqueado_rp3" DECIMAL(16,2),
 "descricaoesfera" TEXT,
 "descricaofuncao" TEXT,
 "descricaolocalizador" TEXT,
 "descricaoorgao" TEXT,
 "descricaosubfuncao" TEXT,
 "descricaouo" TEXT,
 "disponivel" DECIMAL(16,2),
 "dotacaoatual" DECIMAL(16,2),
 "dotacaoinicial" DECIMAL(16,2),
 "emp_liq_inscr_rap_np" DECIMAL(16,2),
 "empenhado" DECIMAL(16,2),
 "empenhoaliquidar" DECIMAL(16,2),
 "empenholiquidado" DECIMAL(16,2),
 "esfera" TEXT,
 "funcao" TEXT,
 "localizador" TEXT,
 "orgao" TEXT,
 "pago" DECIMAL(16,2),
 "pidescricao" TEXT,
 "plano_interno" TEXT,
 "programa" TEXT,
 "projetolei" DECIMAL(16,2),
 "rapapagar" DECIMAL(16,2),
 "rapcancelados" DECIMAL(16,2),
 "rapexerciciosanteriores" DECIMAL(16,2),
 "rapinscrito" DECIMAL(16,2),
 "rappago" DECIMAL(16,2),
 "rp_atual" TEXT,
 "rp_lei" TEXT,
 "subfuncao" TEXT,
 "tituloacao" TEXT,
 "tituloprograma" TEXT,
 "uo" TEXT,
 CONSTRAINT "siop_execucoes_orcamentarias_pac_retornoId_ordem_key" UNIQUE ("retornoId", "ordem"),
 CONSTRAINT "siop_execucoes_orcamentarias_pac_retornoId_empresaId_fkey" FOREIGN KEY ("retornoId", "empresaId") REFERENCES "siop_retornos"("id", "empresaId") ON DELETE RESTRICT
);
CREATE INDEX "siop_execucoes_empresa_retorno_classificacao_idx" ON "siop_execucoes_orcamentarias_pac"("empresaId", "retornoId", "orgao", "uo", "programa", "acao", "localizador");
-- Snapshot por consulta: consultar o mesmo ano duas vezes não duplica os totais.
CREATE VIEW "siop_totais_por_consulta" AS
 SELECT c."empresaId", c."id" AS "consultaId", c."ambiente", c."anoExercicio", r."sucesso", COUNT(e."id") AS "quantidade",
 SUM(e."antecipado") AS "antecipado",
 SUM(e."autorizado") AS "autorizado",
 SUM(e."bloqueado_remanejamento_de_credito") AS "bloqueado_remanejamento_de_credito",
 SUM(e."bloqueado_rp2") AS "bloqueado_rp2",
 SUM(e."bloqueado_rp3") AS "bloqueado_rp3",
 SUM(e."disponivel") AS "disponivel",
 SUM(e."dotacaoatual") AS "dotacaoatual",
 SUM(e."dotacaoinicial") AS "dotacaoinicial",
 SUM(e."emp_liq_inscr_rap_np") AS "emp_liq_inscr_rap_np",
 SUM(e."empenhado") AS "empenhado",
 SUM(e."empenhoaliquidar") AS "empenhoaliquidar",
 SUM(e."empenholiquidado") AS "empenholiquidado",
 SUM(e."pago") AS "pago",
 SUM(e."projetolei") AS "projetolei",
 SUM(e."rapapagar") AS "rapapagar",
 SUM(e."rapcancelados") AS "rapcancelados",
 SUM(e."rapexerciciosanteriores") AS "rapexerciciosanteriores",
 SUM(e."rapinscrito") AS "rapinscrito",
 SUM(e."rappago") AS "rappago"
 FROM "siop_consultas" c JOIN "siop_retornos" r ON r."consultaId" = c."id" AND r."empresaId" = c."empresaId"
 LEFT JOIN "siop_execucoes_orcamentarias_pac" e ON e."retornoId" = r."id" AND e."empresaId" = r."empresaId"
 GROUP BY c."empresaId", c."id", c."ambiente", c."anoExercicio", r."sucesso";
-- Metadados reais das empresas existentes; não fabrica usuário nem credencial.
INSERT INTO "siop_credenciais" ("id", "empresaId", "ambiente", "habilitada", "atualizadoEm")
 SELECT 'siop-hml-' || "id", "id", 'HOMOLOGACAO', false, CURRENT_TIMESTAMP FROM "empresas" WHERE "ativo" = true
 ON CONFLICT ("empresaId", "ambiente") DO NOTHING;
COMMIT;
