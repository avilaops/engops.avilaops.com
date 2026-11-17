import { describe, expect, it } from "vitest";
import { INTERVALOS_WORKER } from "@/dominio/worker";

describe("worker SST", () => {
  it("processa e-mails em até dez segundos sem esperar o ciclo horário de alertas", () => {
    expect(INTERVALOS_WORKER.emailSst).toBeLessThanOrEqual(10_000);
    expect(INTERVALOS_WORKER.emailSst).toBeLessThan(INTERVALOS_WORKER.alertasSst);
  });
});
