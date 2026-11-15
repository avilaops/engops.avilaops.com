import Link from "next/link";
import { UFS } from "@/integracoes/gov";
import type { BuscaGlobalGov } from "@/dominio/gov-catalogo";

export default function GovFiltrosGlobais({ filtros: f, visao }: { filtros: BuscaGlobalGov; visao: string }) {
  return <form action="/gov" method="get" className="panel gov-filters">
    <input type="hidden" name="visao" value={visao} />
    <label>Buscar em toda a base indexada<input name="busca" defaultValue={f.busca} maxLength={200} placeholder="Ex.: manutenção de software" /></label>
    <label>Nome do órgão<input name="orgao" defaultValue={f.orgao} maxLength={200} /></label>
    <label>CNPJ do órgão<input name="cnpj" defaultValue={f.cnpj} pattern="[A-Za-z0-9]{12}[0-9]{2}" maxLength={14} /></label>
    <label>UF<select name="uf" defaultValue={f.uf ?? ""}><option value="">Todas</option>{UFS.map(uf => <option key={uf}>{uf}</option>)}</select></label>
    <label>Região<select name="regiao" defaultValue={f.regiao ?? ""}><option value="">Todas</option>{["Norte", "Nordeste", "Centro-Oeste", "Sudeste", "Sul"].map(v => <option key={v}>{v}</option>)}</select></label>
    <label>Etapa<select name="tipo" defaultValue={f.tipo ?? ""}><option value="">Todas as etapas</option><option value="CONTRATACAO">Contratações</option><option value="PLANEJAMENTO">Planejamento</option><option value="PREGAO">Pregões legados</option></select></label>
    <label>Fonte<select name="fonte" defaultValue={f.fonte ?? ""}><option value="">Todas • sem duplicar PNCP</option><option value="PNCP">PNCP</option><option value="COMPRAS">Compras.gov.br</option></select></label>
    <label>Situação do prazo<select name="abertas" defaultValue={f.abertas ?? ""}><option value="">Todos os prazos</option><option value="sim">Prazo informado em aberto</option></select></label>
    <label>Modalidade<input name="modalidade" defaultValue={f.modalidade} maxLength={100} placeholder="Nome exato • opcional" /></label>
    <label>Categoria do objeto<input name="categoria" defaultValue={f.categoria} maxLength={100} placeholder="Nome da categoria • opcional" /></label>
    <label>Publicado a partir de<input type="date" name="inicio" defaultValue={f.inicio} /></label>
    <label>Publicado até<input type="date" name="fim" defaultValue={f.fim} /></label>
    <label>Valor mínimo<input name="minimo" type="number" min="0" step="0.01" defaultValue={f.minimo} /></label>
    <label>Valor máximo<input name="maximo" type="number" min="0" step="0.01" defaultValue={f.maximo} /></label>
    <div className="page-actions"><button className="primary-button">Aplicar à base inteira</button><Link className="secondary-button" href={`/gov?visao=${visao}`}>Limpar</Link></div>
  </form>;
}
