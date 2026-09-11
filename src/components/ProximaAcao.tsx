"use client";

import Link from "next/link";
import type { StatusJob } from "@prisma/client";
import { prepararSimilAction } from "@/app/acoes/demandas";
import { Toast, useAcao } from "@/components/useAcao";
import type { proximaAcao } from "@/dominio/checklist";

type Props = {
  demandaId: string;
  proxima: ReturnType<typeof proximaAcao>;
  bloqueios: number;
  aprovacao: { id: string; tipo: string } | null;
  jobAtivo: { id: string; status: StatusJob } | null;
  modo: "SOMBRA" | "REAL";
  podePreparar: boolean;
  podeAprovar: boolean;
};

/**
 * O cartão "Próxima ação". A pessoa vê processo, não robô: uma frase e um
 * botão. O que o botão faz por baixo (job, workflow, adapter) não aparece.
 */
export default function ProximaAcao({ demandaId, proxima, bloqueios, aprovacao, jobAtivo, modo, podePreparar, podeAprovar }: Props) {
  const { executar, pendente, toast } = useAcao();
  const alerta = bloqueios > 0 || proxima.acao === "resolver" || proxima.acao === "documentos" || proxima.acao === "completar";

  let botao: React.ReactNode = null;
  if (jobAtivo) {
    botao = <Link href={`/automacoes/${jobAtivo.id}`} className="secondary-button"><span className="dot pulse" /> Acompanhar execução</Link>;
  } else if (proxima.acao === "preparar-simil" && podePreparar) {
    botao = (
      <button type="button" className="primary-button" disabled={pendente} onClick={() => executar(() => prepararSimilAction(demandaId))}>
        {pendente ? "Enfileirando..." : modo === "SOMBRA" ? "Preparar SIMIL (sombra)" : "Preparar SIMIL"}
      </button>
    );
  } else if ((proxima.acao === "aprovar" || proxima.acao === "revisar-sombra") && aprovacao) {
    botao = podeAprovar ? <a href="#aprovacao" className="primary-button">Revisar e decidir</a> : <span className="badge badge-warn">aguardando quem aprova</span>;
  } else if (proxima.acao === "documentos") {
    botao = <a href="#documentos" className="primary-button">Enviar documentos</a>;
  } else if (proxima.acao === "completar") {
    botao = <Link href={`/demandas/${demandaId}/editar`} className="primary-button">Completar cadastro</Link>;
  } else if (proxima.acao === "resolver") {
    botao = <a href="#pendencias" className="primary-button">Ver divergências</a>;
  } else if (proxima.acao === "gerar-rae" || proxima.acao === "executar-siopi") {
    botao = <span className="badge">disponível na próxima fase</span>;
  }

  return (
    <div className={alerta ? "next-action warn" : "next-action"}>
      <div>
        <small>Próxima ação</small>
        <strong>{proxima.titulo}</strong>
        {bloqueios ? <p className="muted" style={{ marginTop: 4 }}>{bloqueios} pendência(s) bloqueiam a automação.</p> : null}
        {modo === "SOMBRA" && proxima.acao === "preparar-simil" ? <p className="muted" style={{ marginTop: 4 }}>Modo sombra: o sistema prepara todos os campos e você compara com o SIMIL. Nada é enviado.</p> : null}
        <Toast estado={toast} />
      </div>
      {botao}
    </div>
  );
}
