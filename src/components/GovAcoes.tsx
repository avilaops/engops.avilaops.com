"use client";

import { useActionState } from "react";
import { analisarGovAction, salvarGovAction, criarAlertaGovAction, removerAlertaGovAction, controlarColetaGovAction } from "@/app/acoes/gov";
import type { BuscaGlobalGov } from "@/dominio/gov-catalogo";
import type { OportunidadeGov } from "@/integracoes/gov";

export function ControlarColetaGov({ id, habilitada }: { id: string; habilitada: boolean }) {
  const [estado, acao, pendente] = useActionState(controlarColetaGovAction, {});
  const rotulo = habilitada ? "Pausar coleta" : "Retomar coleta";
  return <form action={acao}>
    <input type="hidden" name="id" value={id} />
    <input type="hidden" name="operacao" value={habilitada ? "pausar" : "retomar"} />
    <button className="secondary-button" disabled={pendente} aria-label={`${rotulo} ${id}`}>{pendente ? "Atualizando…" : rotulo}</button>
    <p role={estado.erro ? "alert" : "status"}>{estado.erro ?? estado.ok}</p>
  </form>;
}

export function SalvarGov({ dados }: { dados: OportunidadeGov }) {
  const [estado, acao, pendente] = useActionState(salvarGovAction, {});
  return <form action={acao}>
    <input type="hidden" name="dados" value={JSON.stringify(dados)} />
    <button className="secondary-button" disabled={pendente}>{pendente ? "Salvando…" : "Salvar oportunidade"}</button>
    <p role="status">{estado.erro ?? estado.ok}</p>
  </form>;
}

export function AnalisarGov({ id, notas, situacao }: { id: string; notas: string; situacao: string }) {
  const [estado, acao, pendente] = useActionState(analisarGovAction, {});
  return <form action={acao} className="gov-analysis">
    <input type="hidden" name="id" value={id} />
    <label>Situação da análise<select name="situacao" defaultValue={situacao}>
      <option value="SALVA">Salva</option><option value="EM_ANALISE">Em análise</option><option value="INTERESSE">Tenho interesse</option><option value="DESCARTADA">Descartada</option>
    </select></label>
    <label>Notas da empresa<textarea name="notas" defaultValue={notas} maxLength={10000} rows={3} /></label>
    <button className="primary-button" disabled={pendente}>{pendente ? "Atualizando…" : "Atualizar análise"}</button>
    <p role="status">{estado.erro ?? estado.ok}</p>
  </form>;
}

export function CriarAlertaGov({ filtros }: { filtros: BuscaGlobalGov }) {
  const [estado, acao, pendente] = useActionState(criarAlertaGovAction, {});
  return <form action={acao} className="gov-analysis">
    <input type="hidden" name="filtros" value={JSON.stringify(filtros)} />
    <label>Nome do alerta para estes filtros<input name="nome" required minLength={2} maxLength={120} placeholder="Ex.: serviços em São Paulo" /></label>
    <button className="secondary-button" disabled={pendente}>{pendente ? "Criando…" : "Avisar sobre novas oportunidades"}</button>
    <p role="status">{estado.erro ?? estado.ok}</p>
  </form>;
}

export function DesativarAlertaGov({ id }: { id: string }) {
  const [estado, acao, pendente] = useActionState(removerAlertaGovAction, {});
  return <form action={acao}><input type="hidden" name="id" value={id} /><button className="secondary-button" disabled={pendente}>Desativar alerta</button><span role="status">{estado.erro ?? estado.ok}</span></form>;
}
