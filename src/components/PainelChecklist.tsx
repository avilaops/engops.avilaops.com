import type { ItemChecklist } from "@prisma/client";
import { EstadoIcone } from "@/components/Badges";
import { GRUPOS } from "@/dominio/checklist";

/** Checklist calculado do estado real. Não tem caixinha para marcar de propósito. */
export default function PainelChecklist({ itens }: { itens: ItemChecklist[] }) {
  return (
    <section className="panel">
      <div className="panel-title"><h2>Checklist</h2><span className="subtle">calculado do estado real</span></div>
      {GRUPOS.map(([grupo, rotulo]) => {
        const doGrupo = itens.filter((i) => i.grupo === grupo);
        if (!doGrupo.length) return null;
        return (
          <div className="check-group" key={grupo}>
            <h3>{rotulo}</h3>
            {doGrupo.map((i) => (
              <div className="check-item" key={i.id}>
                <EstadoIcone estado={i.estado} />
                <span>{i.rotulo}</span>
                {i.detalhe ? <small>{i.detalhe}</small> : null}
              </div>
            ))}
          </div>
        );
      })}
    </section>
  );
}
