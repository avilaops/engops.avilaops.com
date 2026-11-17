import type { ConfiguracaoSst } from "@/dominio/configuracao-sst";
import { salvarConfiguracaoSstAction } from "@/app/acoes/configuracao-sst";

export default function ConfiguracaoSstForm({ valor }: { valor: ConfiguracaoSst | null }) {
  return <form action={salvarConfiguracaoSstAction} className="form-stack">
    <label className="field"><span>Nome exibido nos documentos</span><input name="nomeExibicao" required defaultValue={valor?.nomeExibicao ?? "GRB"} /></label>
    <label className="field"><span>Responsável técnico</span><input name="responsavelNome" required defaultValue={valor?.responsavelNome ?? ""} /></label>
    <label className="field"><span>Registro profissional</span><input name="responsavelRegistro" required defaultValue={valor?.responsavelRegistro ?? ""} /></label>
    <label className="field"><span>Logo completa • arquivo interno</span><input name="logoPrincipalUrl" defaultValue={valor?.logoPrincipalUrl ?? ""} placeholder="/logo-grb.png" /></label>
    <label className="field"><span>Símbolo • arquivo interno</span><input name="logoSimboloUrl" defaultValue={valor?.logoSimboloUrl ?? "/simbolo.png"} /></label>
    <label className="field"><span>Logo do cliente • arquivo interno</span><input name="logoClienteUrl" defaultValue={valor?.logoClienteUrl ?? ""} /></label>
    <button className="button">Salvar configuração SST</button>
  </form>;
}
