/**
 * Ponto de entrada do processo Node do Next. É aqui que o worker de jobs liga,
 * uma vez por processo, sem depender de request.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.ENGOPS_WORKER !== "1") return;
  const { iniciarWorker } = await import("@/automation/worker");
  iniciarWorker();
}
