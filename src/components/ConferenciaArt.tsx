"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { moeda } from "@/lib/formatos";

type Ordem = {
  codigo: string;
  numeroOs: string;
  tipoServico: string;
  servico: string;
  contratante: string;
  cnpj: string;
  endereco: string;
  pendencias: string[];
};

export default function ConferenciaArt({ ordens }: { ordens: Ordem[] }) {
  const [resultado, setResultado] = useState<{ erros: string[]; total: number; resumo: string }>();
  const numeros = ordens.map((ordem) => ordem.numeroOs.toUpperCase());
  const tipos = new Set(ordens.map((ordem) => ordem.tipoServico));

  function conferir(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const campos = new FormData(event.currentTarget);
    const valor = (nome: string) => String(campos.get(nome) ?? "").trim();
    const competencia = valor("competencia");
    const contrato = valor("contrato");
    const responsavel = valor("responsavel");
    const atividades = valor("atividades");
    const erros: string[] = [];
    let totalCentavos = 0;
    if (!contrato || !responsavel || !atividades) erros.push("Informe o contrato, o registro do responsável técnico e as atividades comuns.");
    for (const ordem of ordens) {
      const inicio = valor(`inicio.${ordem.codigo}`);
      const fim = valor(`fim.${ordem.codigo}`);
      const remuneracao = valor(`valor.${ordem.codigo}`);
      if (!inicio || !fim || inicio > fim || inicio.slice(0, 7) > competencia || fim.slice(0, 7) < competencia) {
        erros.push(`${ordem.codigo}: confira o período da atividade em relação à competência.`);
      }
      if (!/^\d{1,9}(?:\.\d{1,2})?$/.test(remuneracao) || Number(remuneracao) <= 0) {
        erros.push(`${ordem.codigo}: informe a remuneração da OS em reais, com até duas casas decimais.`);
      } else {
        const [reais, centavos = ""] = remuneracao.split(".");
        totalCentavos += Number(reais) * 100 + Number(centavos.padEnd(2, "0"));
      }
    }
    setResultado({ erros, total: totalCentavos / 100, resumo: `${competencia} · Contrato ${contrato} · CREA ${responsavel} · ${atividades}` });
  }

  return (
    <form className="panel" onSubmit={conferir} onChange={() => setResultado(undefined)}>
      <div className="panel-title"><h2>Conferir {ordens.length} OS</h2></div>
      <p className="muted">Prepare um lote por contrato e responsável técnico, com as mesmas atividades em todas as OS. A prévia fica nesta tela.</p>
      {tipos.size > 1 ? <p role="alert">Separe as demandas por tipo de serviço para este piloto.</p> : null}
      <div className="field-grid">
        <label className="field"><span>Competência</span><input name="competencia" type="month" required /></label>
        <label className="field"><span>Contrato CAIXA</span><input name="contrato" maxLength={80} required /></label>
        <label className="field"><span>Registro CREA do responsável técnico</span><input name="responsavel" maxLength={40} required /></label>
        <label className="field"><span>Atividades técnicas comuns</span><input name="atividades" maxLength={200} required /></label>
      </div>
      {ordens.map((ordem) => (
        <fieldset className="panel" key={ordem.codigo}>
          <legend><Link href={`/demandas/codigo/${ordem.codigo}`}>{ordem.codigo}</Link> · {ordem.numeroOs || "Sem número de OS"} · {ordem.servico}</legend>
          <p>{ordem.contratante} {ordem.cnpj} · {ordem.endereco}</p>
          {ordem.pendencias.map((pendencia) => <p key={pendencia} role="alert">{pendencia}</p>)}
          <div className="field-grid">
            <label className="field"><span>Início da atividade</span><input name={`inicio.${ordem.codigo}`} type="date" required /></label>
            <label className="field"><span>Término da atividade</span><input name={`fim.${ordem.codigo}`} type="date" required /></label>
            <label className="field"><span>Remuneração da OS (R$)</span><input name={`valor.${ordem.codigo}`} type="number" min="0.01" max="999999999.99" step="0.01" required /></label>
          </div>
        </fieldset>
      ))}
      {new Set(numeros).size < numeros.length ? <p role="alert">Há números de OS repetidos. Confira os registros antes de montar o lote.</p> : null}
      <label className="field"><span><input type="checkbox" required /> Conferi que contrato, responsável e atividades se aplicam a todas as OS.</span></label>
      <button className="secondary-button" disabled={tipos.size !== 1 || new Set(numeros).size < numeros.length || ordens.some((ordem) => ordem.pendencias.length > 0)}>Conferir prévia</button>
      {resultado?.erros.length ? <ul role="alert">{resultado.erros.map((erro) => <li key={erro}>{erro}</li>)}</ul> : null}
      {resultado && !resultado.erros.length ? (
        <div role="status">
          <p><strong>{ordens.length} OS · {moeda(resultado.total)}</strong> em remuneração</p>
          <p>{resultado.resumo}</p>
          <p>Prévia para conferência. O registro oficial é feito no CreaOne.</p>
        </div>
      ) : null}
    </form>
  );
}
