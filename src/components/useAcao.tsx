"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import type { EstadoAcao } from "@/app/acoes/demandas";

/**
 * Executa uma server action de botão, mostra toast e recarrega a tela.
 * Erro fica visível até o próximo clique; sucesso some em 2,8s.
 */
export function useAcao() {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [toast, setToast] = useState<EstadoAcao | null>(null);

  const executar = useCallback(
    (fn: () => Promise<EstadoAcao>) => {
      iniciar(async () => {
        const r = await fn();
        setToast(r);
        if (r.ok) {
          router.refresh();
          setTimeout(() => setToast((t) => (t === r ? null : t)), 2800);
        }
      });
    },
    [router],
  );

  return { executar, pendente, toast, limpar: () => setToast(null) };
}

export function Toast({ estado }: { estado: EstadoAcao | null }) {
  if (!estado) return null;
  if (estado.erro) return <p className="form-error" style={{ marginTop: 10 }}>{estado.erro}</p>;
  return <div className="toast" role="status">{estado.ok}</div>;
}
