"use client";

import { useActionState } from "react";
import { registrarManualAction, salvarOperacaoAction } from "@/app/acoes/integracoes";
import type { ConfiguracaoOperacional } from "@prisma/client";
import type { SistemaOperacional } from "@/dominio/operacoes-externas";

export function ConfiguracaoOperacaoForm({ sistema, config }: { sistema: SistemaOperacional; config: ConfiguracaoOperacional | null }) {
  const [estado, agir, pendente] = useActionState(salvarOperacaoAction, {});
  return <form action={agir} className="form">
    <input type="hidden" name="sistema" value={sistema} />
    <label className="field"><span>Endereço do portal</span><input name="portalUrl" type="url" placeholder="https://" maxLength={1000} defaultValue={config?.portalUrl ?? ""} /></label>
    <p className="muted">Use o endereço oficial de entrada, sem senha ou parâmetros de sessão.</p>
    <div className="field-grid">
      <label className="field"><span>Unidade de atendimento</span><input name="unidade" maxLength={100} defaultValue={config?.unidade ?? ""} /></label>
      <label className="field"><span>Operação atendida</span><input name="operacao" maxLength={200} defaultValue={config?.operacao ?? ""} /></label>
    </div>
    <label className="field"><span>Orientações da empresa</span><textarea name="observacoes" rows={3} maxLength={2000} defaultValue={config?.observacoes ?? ""} /></label>
    <p className="muted">Estes parâmetros organizam o trabalho manual. O acesso ao portal continua sujeito às credenciais e permissões da sua empresa.</p>
    {estado.erro ? <p role="alert" className="form-error">{estado.erro}</p> : null}
    {estado.ok ? <p role="status" className="form-ok">{estado.ok}</p> : null}
    <button className="primary-button" disabled={pendente}>{pendente ? "Salvando..." : "Salvar parâmetros"}</button>
  </form>;
}

export function RegistroManualForm({ sistema, demandaId, documentos, disponivel }: {
  sistema: SistemaOperacional; demandaId: string; documentos: { id: string; nomeArquivo: string }[]; disponivel: boolean;
}) {
  const [estado, agir, pendente] = useActionState(registrarManualAction, {});
  return <form action={agir} className="form">
    <input type="hidden" name="sistema" value={sistema} /><input type="hidden" name="demandaId" value={demandaId} />
    <label className="field"><span>Comprovante do dossiê</span><select name="documentoId" required defaultValue="" disabled={!disponivel || pendente}>
      <option value="" disabled>Selecione o documento</option>{documentos.map(d => <option key={d.id} value={d.id}>{d.nomeArquivo}</option>)}
    </select></label>
    <label className="field"><span>{sistema === "RAE" ? "Referência do relatório • opcional" : "Protocolo da operação"}</span><input name="protocolo" required={sistema !== "RAE"} maxLength={200} disabled={!disponivel || pendente} /></label>
    <label className="field"><span>Observações do registro</span><textarea name="observacoes" rows={2} maxLength={2000} disabled={!disponivel || pendente} /></label>
    {estado.erro ? <p role="alert" className="form-error">{estado.erro}</p> : null}
    {estado.ok ? <p role="status" className="form-ok">{estado.ok}</p> : null}
    <button className="primary-button" disabled={!disponivel || pendente}>{pendente ? "Registrando..." : "Registrar operação manual"}</button>
  </form>;
}
