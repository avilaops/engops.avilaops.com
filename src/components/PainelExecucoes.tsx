import type { Aprovacao, ExecucaoExterna } from "@prisma/client";
import { EstadoIcone, ModoBadge } from "@/components/Badges";
import PainelAprovacao from "@/components/PainelAprovacao";
import type { CampoPreparado } from "@/automation/adapters/simil";
import { dataHora } from "@/lib/formatos";

const NOME_STATUS: Record<ExecucaoExterna["status"], string> = {
  PREPARADA: "Preparada",
  AGUARDANDO_APROVACAO: "Aguardando aprovação",
  EXECUTANDO: "Executando",
  CONCLUIDA: "Concluída",
  FALHOU: "Falhou",
  CANCELADA: "Cancelada",
};

/** SIMIL, RAE e SIOPI: cada passagem, com os campos exatamente como iriam. */
export default function PainelExecucoes({ demandaId, execucoes, aprovacoes, modo, podeAprovar }: { demandaId: string; execucoes: ExecucaoExterna[]; aprovacoes: Aprovacao[]; modo: "SOMBRA" | "REAL"; podeAprovar: boolean }) {
  if (!execucoes.length) return null;
  return (
    <section className="panel" id="execucoes">
      <div className="panel-title"><h2>SIMIL, RAE e SIOPI</h2><ModoBadge modo={modo} /></div>
      {execucoes.map((x) => {
        const dados = x.dados as { campos?: CampoPreparado[]; resumo?: Record<string, number> };
        const aprovacao = aprovacoes.find((a) => a.jobId === x.jobId && a.status === "PENDENTE") ?? null;
        const tom = x.status === "CONCLUIDA" ? "badge badge-good" : x.status === "FALHOU" || x.status === "CANCELADA" ? "badge badge-bad" : "badge badge-warn";
        return (
          <div key={x.id} style={{ borderTop: "1px solid var(--line-soft)", paddingTop: 12, marginTop: 12 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 8 }}>
              <strong>{x.sistema}</strong>
              <span className={tom}>{NOME_STATUS[x.status]}</span>
              <span className="badge">{x.modo === "SOMBRA" ? "sombra" : "real"}</span>
              <span className="subtle">{dataHora(x.iniciadoEm)}{x.terminadoEm ? ` → ${dataHora(x.terminadoEm)}` : ""}</span>
              {x.protocolo ? <span className="badge">protocolo {x.protocolo}</span> : null}
            </div>
            {dados.resumo ? <p className="muted" style={{ marginBottom: 8 }}>{dados.resumo.total} campos: {dados.resumo.validados} validados, {dados.resumo.revisar} para revisar, {dados.resumo.ausentes} ausentes.</p> : null}
            {x.erroMensagem ? <p className="form-error">{x.erroCodigo}: {x.erroMensagem}</p> : null}
            {dados.campos?.length ? (
              <div style={{ overflowX: "auto" }}>
                <table className="campos-table">
                  <thead><tr><th></th><th>Campo</th><th>Origem</th><th>Valor preparado</th></tr></thead>
                  <tbody>
                    {dados.campos.map((c) => (
                      <tr key={c.campo}>
                        <td><EstadoIcone estado={c.estado} /></td>
                        <td>{c.rotulo}{c.observacao ? <small className="subtle" style={{ display: "block" }}>{c.observacao}</small> : null}</td>
                        <td className="subtle">{c.origem}</td>
                        <td className="valor">{c.valor || <span className="subtle">vazio</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
            {aprovacao ? <PainelAprovacao aprovacao={aprovacao} modo={x.modo} demandaId={demandaId} podeAprovar={podeAprovar} /> : null}
          </div>
        );
      })}
    </section>
  );
}
