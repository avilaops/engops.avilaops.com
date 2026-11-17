export const INTERVALOS_WORKER = {
  ocioso: 3_000,
  outbox: 10_000,
  alertasSst: 60 * 60 * 1_000,
  emailSst: 10_000,
} as const;
