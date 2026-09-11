import { registrarWorkflow } from "@/automation/core/registro";
import { prepararSimil } from "@/automation/workflows/preparar-simil";

/**
 * Registro dos workflows conhecidos por este build. Importar este módulo é
 * o que os torna disponíveis para `enfileirar()` e para o worker.
 */
registrarWorkflow(prepararSimil);

export const WORKFLOWS_DISPONIVEIS = [prepararSimil] as const;
