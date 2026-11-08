"use client";

import { useActionState, useCallback, useState, useTransition } from "react";
import type { Demanda } from "@prisma/client";
import { PRIORIDADES, TIPOS_SERVICO, UFS } from "@/dominio/demandas";
import type { EstadoAcao } from "@/app/acoes/demandas";
import { consultarCepAction } from "@/app/acoes/cep";
import ClienteForm from "@/components/ClienteForm";
import Sheet from "@/components/ui/Sheet";

/** Decimal do Prisma não atravessa a fronteira servidor → cliente: a página converte para número antes. */
export type DemandaParaForm = Omit<Partial<Demanda>, "areaM2" | "valorAvaliacao"> & { areaM2?: number | null; valorAvaliacao?: number | null };

type Props = {
  acao: (estado: EstadoAcao, form: FormData) => Promise<EstadoAcao>;
  demanda?: DemandaParaForm | null;
  membros: Array<{ id: string; nome: string }>;
  clientes: Array<{ id: string; nome: string }>;
  podeCadastrarContratante: boolean;
  rotuloBotao: string;
};

const dataInput = (d: Date | string | null | undefined) => (d ? new Date(d).toISOString().slice(0, 10) : "");
const num = (v: unknown) => (v === null || v === undefined ? "" : String(Number(v)).replace(".", ","));

/**
 * Um formulário para criar e editar. Rótulo acima do campo, um campo por
 * linha no celular, 48px de altura, fonte 16px (o Safari não dá zoom).
 */
export default function DemandaForm({ acao, demanda, membros, clientes, podeCadastrarContratante, rotuloBotao }: Props) {
  const [estado, agir, pendente] = useActionState(acao, {} as EstadoAcao);
  const d = demanda ?? {};
  const [clienteId, definirClienteId] = useState(d.clienteId ?? "");
  const [novosClientes, definirNovosClientes] = useState<Props["clientes"]>([]);
  const opcoesClientes = [...clientes, ...novosClientes.filter((novo) => !clientes.some((cliente) => cliente.id === novo.id))];
  const [cadastroAberto, definirCadastroAberto] = useState(false);
  const fecharCadastro = useCallback(() => definirCadastroAberto(false), []);
  const [cep, definirCep] = useState(d.cep ?? "");
  const [endereco, definirEndereco] = useState({ logradouro: d.endereco ?? "", bairro: d.bairro ?? "", municipio: d.municipio ?? "", uf: d.uf ?? "" });
  const [avisoCep, definirAvisoCep] = useState("");
  const [consultandoCep, consultarCep] = useTransition();

  function buscarCep() {
    consultarCep(async () => {
      definirAvisoCep("");
      try {
        const resultado = await consultarCepAction(cep);
        if (!resultado.endereco) {
          definirAvisoCep(resultado.erro);
          return;
        }
        const encontrado = resultado.endereco;
        definirCep(encontrado.cep);
        definirEndereco((atual) => ({
          logradouro: encontrado.logradouro || atual.logradouro,
          bairro: encontrado.bairro || atual.bairro,
          municipio: encontrado.municipio,
          uf: encontrado.uf,
        }));
        definirAvisoCep(encontrado.logradouro && encontrado.bairro ? "Endereço encontrado. Confira os dados e informe o número." : "CEP encontrado. Confira e complete o logradouro e o bairro manualmente.");
      } catch {
        definirAvisoCep("Consulta de CEP indisponível. Você pode preencher o endereço manualmente.");
      }
    });
  }
  return (
    <>
    <form action={agir} className="form">
      <div className="form-section">
        <h3>Serviço</h3>
        <div className="field-grid-3">
          <label className="field"><span>Número da OS</span><input name="numeroOs" defaultValue={d.numeroOs ?? ""} placeholder="ex.: 18453" /></label>
          <label className="field"><span>Tipo de serviço</span>
            <select name="tipoServico" defaultValue={d.tipoServico ?? "AVALIACAO_IMOVEL"}>{TIPOS_SERVICO.map(([k, r]) => <option key={k} value={k}>{r}</option>)}</select>
          </label>
          <label className="field"><span>Prioridade</span>
            <select name="prioridade" defaultValue={d.prioridade ?? "NORMAL"}>{PRIORIDADES.map(([k, r]) => <option key={k} value={k}>{r}</option>)}</select>
          </label>
        </div>
        <div className="field-grid-3">
          <label className="field"><span>Prazo</span><input type="date" name="prazo" defaultValue={dataInput(d.prazo)} /></label>
          <label className="field"><span>Responsável</span>
            <select name="responsavelId" defaultValue={d.responsavelId ?? ""}><option value="">Sem responsável</option>{membros.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}</select>
          </label>
          <div className="field">
            <label className="field"><span>Contratante</span>
              <select name="clienteId" value={clienteId} onChange={(e) => definirClienteId(e.target.value)}>
                <option value="">Não informado</option>
                {opcoesClientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </label>
            {podeCadastrarContratante ? <button type="button" className="text-button" onClick={() => definirCadastroAberto(true)} disabled={pendente}>+ Cadastrar contratante</button> : null}
          </div>
        </div>
      </div>

      <div className="form-section">
        <h3>Imóvel</h3>
        <div className="field-grid">
          <label className="field"><span>CEP</span><input name="cep" value={cep} onChange={(e) => { definirCep(e.target.value); definirAvisoCep(""); }} readOnly={consultandoCep} inputMode="numeric" maxLength={9} placeholder="00000-000" autoComplete="postal-code" /></label>
          <div className="field"><button type="button" className="secondary-button" onClick={buscarCep} disabled={pendente || consultandoCep || !/^\d{5}-?\d{3}$/.test(cep.trim())}>{consultandoCep ? "Consultando CEP…" : "Buscar endereço pelo CEP"}</button></div>
        </div>
        {avisoCep ? <p role="status">{avisoCep}</p> : null}
        <div className="field-grid">
          <label className="field"><span>Endereço</span><input name="endereco" value={endereco.logradouro} onChange={(e) => definirEndereco({ ...endereco, logradouro: e.target.value })} readOnly={consultandoCep} placeholder="Rua, avenida..." /></label>
          <div className="field-grid">
            <label className="field"><span>Número</span><input name="numero" defaultValue={d.numero ?? ""} /></label>
            <label className="field"><span>Complemento</span><input name="complemento" defaultValue={d.complemento ?? ""} /></label>
          </div>
        </div>
        <div className="field-grid-3">
          <label className="field"><span>Bairro</span><input name="bairro" value={endereco.bairro} onChange={(e) => definirEndereco({ ...endereco, bairro: e.target.value })} readOnly={consultandoCep} /></label>
          <label className="field"><span>Município</span><input name="municipio" value={endereco.municipio} onChange={(e) => definirEndereco({ ...endereco, municipio: e.target.value })} readOnly={consultandoCep} /></label>
          <label className="field"><span>UF</span>
            <select name="uf" value={endereco.uf} onChange={(e) => definirEndereco({ ...endereco, uf: e.target.value })} disabled={consultandoCep}><option value="">UF</option>{UFS.map((u) => <option key={u} value={u}>{u}</option>)}</select>
          </label>
        </div>
        <div className="field-grid-3">
          <label className="field"><span>Matrícula</span><input name="matricula" defaultValue={d.matricula ?? ""} /></label>
          <label className="field"><span>Cartório</span><input name="cartorio" defaultValue={d.cartorio ?? ""} placeholder="1º RI de ..." /></label>
          <div className="field-grid">
            <label className="field"><span>Área (m²)</span><input name="areaM2" defaultValue={num(d.areaM2)} inputMode="decimal" placeholder="0,00" /></label>
            <label className="field"><span>Tipo do imóvel</span><input name="tipoImovel" defaultValue={d.tipoImovel ?? ""} placeholder="Casa, apartamento..." /></label>
          </div>
        </div>
      </div>

      <div className="form-section">
        <h3>Proprietário</h3>
        <div className="field-grid">
          <label className="field"><span>Nome</span><input name="proprietarioNome" defaultValue={d.proprietarioNome ?? ""} /></label>
          <label className="field"><span>CPF / CNPJ</span><input name="proprietarioDoc" defaultValue={d.proprietarioDoc ?? ""} inputMode="numeric" /></label>
        </div>
      </div>

      <div className="form-section">
        <h3>Avaliação</h3>
        <div className="field-grid">
          <label className="field"><span>Valor de avaliação (R$)</span><input name="valorAvaliacao" defaultValue={num(d.valorAvaliacao)} inputMode="decimal" placeholder="0,00" /></label>
          <label className="field"><span>Data da vistoria</span><input type="date" name="dataVistoria" defaultValue={dataInput(d.dataVistoria)} /></label>
        </div>
        <label className="field"><span>Observações</span><textarea name="observacoes" defaultValue={d.observacoes ?? ""} /></label>
      </div>

      {estado.erro ? <p className="form-error">{estado.erro}</p> : null}
      {estado.ok ? <p className="form-ok">{estado.ok}</p> : null}
      <button type="submit" className="primary-button" disabled={pendente || consultandoCep}>{pendente ? "Salvando..." : rotuloBotao}</button>
    </form>
    {cadastroAberto ? <Sheet titulo="Cadastrar contratante" aoFechar={fecharCadastro}>
      <ClienteForm aoCadastrar={(cliente) => {
        definirNovosClientes((atuais) => [...atuais, cliente]);
        definirClienteId(cliente.id);
        fecharCadastro();
      }} />
    </Sheet> : null}
    </>
  );
}
