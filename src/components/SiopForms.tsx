"use client";

import { useActionState } from "react";
import { consultarSiopAction, salvarSiopAction } from "@/app/acoes/integracoes";
import type { obterConfiguracaoSiop } from "@/servicos/siop";

type Configuracao = Awaited<ReturnType<typeof obterConfiguracaoSiop>>;

export function ConfiguracaoSiopForm({ config, podeVincularReferencia }: { config: Configuracao; podeVincularReferencia: boolean }) {
  const [estado, agir, pendente] = useActionState(salvarSiopAction, {});
  return <form action={agir} className="form">
    <input type="hidden" name="ambiente" value={config.ambiente} />
    <label className="field"><span>Usuário do webservice</span><input name="usuario" required maxLength={256} defaultValue={config.usuario ?? ""} autoComplete="off" /></label>
    <div className="field-grid">
      <label className="field"><span>Perfil</span><input name="perfil" type="number" step="1" min="-2147483648" max="2147483647" required defaultValue={config.perfil ?? ""} /></label>
      <label className="field"><span>E-mail</span><input name="email" type="email" maxLength={320} defaultValue={config.email ?? ""} /></label>
    </div>
    <label className="field"><span>Referência da credencial protegida</span><input name="senhaEnvRef" readOnly={!podeVincularReferencia} required pattern="SIOP_[A-Z0-9_]{1,100}_MD5" maxLength={109} placeholder="SIOP_EMPRESA_HML_MD5" defaultValue={config.senhaEnvRef ?? ""} autoComplete="off" /></label>
    <p className="muted">{podeVincularReferencia ? "Informe o nome da variável protegida cadastrada no servidor. A senha específica do webservice é configurada pela administração do ambiente." : "A referência protegida é vinculada pelo dono da plataforma. Você pode manter os parâmetros e habilitar a credencial já associada a esta empresa."}</p>
    <label><input type="checkbox" name="habilitada" defaultChecked={config.habilitada} /> Habilitar consultas neste ambiente</label>
    <p role="status">{config.credencialDisponivel ? "Credencial protegida disponível." : "Credencial protegida ainda indisponível. Você pode salvar os parâmetros com as consultas desabilitadas."}</p>
    {estado.erro ? <p className="form-error" role="alert">{estado.erro}</p> : null}
    {estado.ok ? <p className="form-ok" role="status">{estado.ok}</p> : null}
    <button className="primary-button" disabled={pendente || (!podeVincularReferencia && !config.senhaEnvRef)}>{pendente ? "Salvando..." : "Salvar configuração SIOP"}</button>
  </form>;
}

export function ConsultaSiopForm({ ambiente, disponivel }: { ambiente: Configuracao["ambiente"]; disponivel: boolean }) {
  const [estado, agir, pendente] = useActionState(consultarSiopAction, {});
  return <form action={agir} className="form">
    <input type="hidden" name="ambiente" value={ambiente} />
    <label className="field"><span>Exercício</span><input name="anoExercicio" type="number" step="1" min="-2147483648" max="2147483647" defaultValue={new Date().getFullYear()} required disabled={!disponivel || pendente} /></label>
    {!disponivel ? <p className="muted">As consultas estarão disponíveis após a configuração e habilitação da credencial do webservice.</p> : null}
    {estado.erro ? <p className="form-error" role="alert">{estado.erro}</p> : null}
    <button className="primary-button" disabled={!disponivel || pendente}>{pendente ? "Consultando SIOP..." : "Consultar execução orçamentária"}</button>
  </form>;
}
