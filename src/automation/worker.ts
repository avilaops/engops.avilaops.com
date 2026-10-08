import { randomUUID } from "node:crypto";
import { umCiclo } from "@/automation/core/fila";
import { entregarEventos } from "@/automation/outbox";
import "@/automation/workflows";

/**
 * Processador de jobs dentro do próprio processo do Next. Um container só,
 * ligado por `ENGOPS_WORKER=1`. Quando o volume pedir, o mesmo código roda num
 * processo separado: nada aqui depende de request.
 */
const INTERVALO_OCIOSO_MS = 3_000;
const INTERVALO_OUTBOX_MS = 10_000;

let ligado = false;

export function iniciarWorker() {
  if (ligado) return;
  ligado = true;
  const workerId = `worker-${randomUUID().slice(0, 8)}`;
  console.log(`[engops] worker ${workerId} ligado`);

  const laco = async () => {
    try {
      const teve = await umCiclo(workerId);
      setTimeout(laco, teve ? 50 : INTERVALO_OCIOSO_MS);
    } catch (e) {
      console.error("[engops] worker falhou no ciclo", e);
      setTimeout(laco, INTERVALO_OCIOSO_MS * 2);
    }
  };
  const outbox = async () => {
    try {
      await entregarEventos();
    } catch (e) {
      console.error("[engops] outbox falhou", e);
    } finally {
      setTimeout(outbox, INTERVALO_OUTBOX_MS);
    }
  };
  setTimeout(laco, 1_000);
  setTimeout(outbox, 5_000);
}
