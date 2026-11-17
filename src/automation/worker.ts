import { randomUUID } from "node:crypto";
import { umCiclo } from "@/automation/core/fila";
import { entregarEventos } from "@/automation/outbox";
import "@/automation/workflows";
import { iniciarColetaGov } from "@/automation/gov-coleta";
import { gerarAlertasVencimentosSst } from "@/servicos/alertas-sst";
import { processarFilaEmailSst } from "@/servicos/fila-email-sst";
import { INTERVALOS_WORKER } from "@/dominio/worker";

/**
 * Processador de jobs dentro do próprio processo do Next. Um container só,
 * ligado por `ENGOPS_WORKER=1`. Quando o volume pedir, o mesmo código roda num
 * processo separado: nada aqui depende de request.
 */
let ligado = false;

export function iniciarWorker() {
  if (ligado) return;
  ligado = true;
  iniciarColetaGov();
  const workerId = `worker-${randomUUID().slice(0, 8)}`;
  console.log(`[engops] worker ${workerId} ligado`);

  const laco = async () => {
    try {
      const teve = await umCiclo(workerId);
      setTimeout(laco, teve ? 50 : INTERVALOS_WORKER.ocioso);
    } catch (e) {
      console.error("[engops] worker falhou no ciclo", e);
      setTimeout(laco, INTERVALOS_WORKER.ocioso * 2);
    }
  };
  const outbox = async () => {
    try {
      await entregarEventos();
    } catch (e) {
      console.error("[engops] outbox falhou", e);
    } finally {
      setTimeout(outbox, INTERVALOS_WORKER.outbox);
    }
  };
  const alertasSst = async () => {
    try { await gerarAlertasVencimentosSst(); }
    catch (e) { console.error("[engops] alertas SST falharam", e); }
    finally { setTimeout(alertasSst, INTERVALOS_WORKER.alertasSst); }
  };
  const emailsSst = async () => {
    try { await processarFilaEmailSst(); }
    catch (e) { console.error("[engops] fila de e-mail SST falhou", e); }
    finally { setTimeout(emailsSst, INTERVALOS_WORKER.emailSst); }
  };
  setTimeout(laco, 1_000);
  setTimeout(outbox, 5_000);
  setTimeout(alertasSst, 15_000);
  setTimeout(emailsSst, 8_000);
}
