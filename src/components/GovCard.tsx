import { AnalisarGov, SalvarGov } from "@/components/GovAcoes";
import type { OportunidadeGov } from "@/integracoes/gov";
import { moeda } from "@/lib/formatos";

export function dataGovTela(d: string | Date | null | undefined) {
  if (!d) return "Não informada";
  const valor = typeof d === "string" ? d : d.toISOString();
  const m = valor.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}${valor.includes("T") ? ` • ${valor.slice(11, 16)}` : ""}` : "Não informada";
}
export default function GovCard({ item, editar, fontes, conferidoEm, salva }: {
  item: OportunidadeGov; editar: boolean; fontes?: string[]; conferidoEm?: Date;
  salva?: { id: string; notas: string; situacao: string; erroConferencia: string | null; proximaConferenciaEm: Date };
}) {
  return <article className="panel gov-card">
    <div className="gov-card-top"><span>{(fontes ?? [item.fonte]).join(" • ")} • {item.tipo === "PLANEJAMENTO" ? `Planejamento ${item.ano}` : item.modalidade ?? "Contratação"}</span><strong>{item.valor === null ? "Valor não informado" : moeda(item.valor)}</strong></div>
    <h2>{item.objeto}</h2><p>{item.orgao}{item.municipio ? ` • ${item.municipio}` : ""}{item.uf ? ` • ${item.uf}` : ""}</p>
    <div className="gov-card-dates"><span>{item.tipo === "PLANEJAMENTO" ? "Data desejada" : "Prazo informado"} • {dataGovTela(item.prazo)}</span><span>Publicação • {dataGovTela(item.publicado)}</span></div>
    <details><summary>Detalhes e origem</summary><dl className="kv"><dt>Identificação</dt><dd>{item.id}</dd><dt>Situação na fonte</dt><dd>{item.situacao ?? "Não informada"}</dd><dt>Categoria</dt><dd>{item.categoria ?? "Não informada pela fonte"}</dd><dt>Atualizado na fonte</dt><dd>{dataGovTela(item.atualizado)}</dd><dt>Última conferência</dt><dd>{dataGovTela(conferidoEm)}</dd></dl></details>
    <div className="gov-card-actions"><a className="secondary-button" href={item.url} target="_blank" rel="noopener noreferrer">Abrir fonte oficial</a>{editar && !salva && <SalvarGov dados={item} />}</div>
    {salva?.erroConferencia && <p role="status">Última tentativa de atualização falhou • {salva.erroConferencia}. Retrato anterior preservado.</p>}
    {salva && (editar ? <AnalisarGov id={salva.id} notas={salva.notas} situacao={salva.situacao} /> : <p>{salva.situacao} • {salva.notas}</p>)}
  </article>;
}
