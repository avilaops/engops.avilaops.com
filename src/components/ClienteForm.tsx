"use client";

import { useActionState, useState, useTransition } from "react";
import { consultarCnpjAction, criarClienteAction } from "@/app/acoes/clientes";
import type { EstadoAcao } from "@/app/acoes/demandas";
import type { DadosCnpj } from "@/servicos/cnpjws";
import { validarCpfCnpj } from "@/dominio/validacao";
import ResumoCnpj from "@/components/ResumoCnpj";

export default function ClienteForm({ aoCadastrar }: { aoCadastrar?: (cliente: { id: string; nome: string }) => void }) {
  const [documento, definirDocumento] = useState("");
  const [nome, definirNome] = useState("");
  const [email, definirEmail] = useState("");
  const [telefone, definirTelefone] = useState("");
  const [dados, definirDados] = useState<DadosCnpj | null>(null);
  const [aviso, definirAviso] = useState("");
  const [consultando, consultar] = useTransition();
  const [estado, agir, pendente] = useActionState(async (anterior: EstadoAcao, form: FormData) => {
    const resultado = await criarClienteAction(anterior, form);
    if (resultado.ok) { definirDocumento(""); definirNome(""); definirEmail(""); definirTelefone(""); definirDados(null); definirAviso(""); }
    if (resultado.cliente) aoCadastrar?.(resultado.cliente);
    return resultado;
  }, {} as EstadoAcao);
  const numero = documento.replace(/\D/g, "");
  const valido = validarCpfCnpj(numero);
  return (
    <form action={agir} className="form">
      <label className="field"><span>CNPJ / CPF</span><input name="documento" inputMode="numeric" required maxLength={18} autoComplete="off" value={documento} disabled={consultando || pendente} aria-describedby="documento-ajuda" onChange={(e) => {
        definirDocumento(e.target.value); definirDados(null); definirAviso(""); definirNome(""); definirEmail(""); definirTelefone("");
      }} /></label>
      <p id="documento-ajuda" className="muted">Informe primeiro o documento. CNPJ permite consultar dados da empresa; para CPF, preencha os dados manualmente.</p>
      <button type="button" className="secondary-button" disabled={consultando || pendente || numero.length !== 14 || !valido} onClick={() => consultar(async () => {
        definirAviso("");
        try {
          const resultado = await consultarCnpjAction(documento);
          if (!resultado.dados) { definirAviso(resultado.erro ?? "Consulta indisponível."); return; }
          const d = resultado.dados;
          definirDados(d); definirNome(d.razao_social);
          definirEmail(d.estabelecimento.email?.trim() ?? "");
          definirTelefone([d.estabelecimento.ddd1, d.estabelecimento.telefone1].filter(Boolean).join(" "));
          definirAviso("Dados encontrados. Revise nome e contato antes de cadastrar.");
        } catch { definirAviso("Não foi possível consultar. Tente novamente ou preencha manualmente."); }
      })}>{consultando ? "Consultando CNPJ.ws…" : "Consultar CNPJ e preencher"}</button>
      {aviso ? <p role="status">{aviso}</p> : null}
      {numero.length === 11 && valido ? <p className="muted">CPF válido. A CNPJ.ws não preenche dados de pessoa física.</p> : null}
      {dados ? <><ResumoCnpj dados={dados} /><input type="hidden" name="importarCnpj" value={numero} /><button type="button" className="text-button" disabled={consultando || pendente} onClick={() => { definirDados(null); definirAviso("Cadastro manual selecionado. Os dados preenchidos foram mantidos."); }}>Usar somente os dados manuais</button></> : null}
      <label className="field"><span>Nome / razão social</span><input name="nome" required minLength={2} maxLength={160} value={nome} disabled={consultando} onChange={(e) => definirNome(e.target.value)} /></label>
      <div className="field-grid">
        <label className="field"><span>Telefone</span><input name="telefone" inputMode="tel" maxLength={30} value={telefone} disabled={consultando} onChange={(e) => definirTelefone(e.target.value)} /></label>
      </div>
      <label className="field"><span>E-mail</span><input name="email" type="email" value={email} disabled={consultando} onChange={(e) => definirEmail(e.target.value)} /></label>
      {estado.erro ? <p className="form-error">{estado.erro}</p> : null}
      {estado.ok ? <p className="form-ok">{estado.ok}</p> : null}
      <button type="submit" className="primary-button" disabled={pendente || consultando || !valido}>{pendente ? "Salvando..." : "Cadastrar contratante"}</button>
    </form>
  );
}
