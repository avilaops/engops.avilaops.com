import type { Workflow } from "@/automation/core/tipos";
import { ErroAutomacao } from "@/automation/core/erros";

const workflows = new Map<string, Workflow>();

export function registrarWorkflow(w: Workflow) {
  workflows.set(w.nome, w);
}

export function obterWorkflow(nome: string): Workflow {
  const w = workflows.get(nome);
  if (!w) throw new ErroAutomacao("WORKFLOW_NOT_FOUND", `Workflow "${nome}" não registrado`, { retentavel: false });
  return w;
}

export function listarWorkflows(): Workflow[] {
  return [...workflows.values()];
}
