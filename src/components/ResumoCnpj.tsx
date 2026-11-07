import type { DadosCnpj } from "@/servicos/cnpjws";

export default function ResumoCnpj({ dados, salvo = false }: { dados: DadosCnpj; salvo?: boolean }) {
  const e = dados.estabelecimento;
  const campos = [
    ["Razão social", dados.razao_social], ["Nome fantasia", e.nome_fantasia],
    ["Situação cadastral", e.situacao_cadastral], ["Início da atividade", e.data_inicio_atividade],
    ["Endereço", [e.tipo_logradouro, e.logradouro, e.numero, e.complemento, e.bairro].filter(Boolean).join(", ")],
    ["Município / UF", [e.cidade?.nome, e.estado?.sigla].filter(Boolean).join(" / ")],
    ["CEP", e.cep], ["Atividade principal", [e.atividade_principal?.id, e.atividade_principal?.descricao].filter(Boolean).join(" — ")],
    ["Porte", dados.porte?.descricao], ["Natureza jurídica", dados.natureza_juridica?.descricao],
    ["Capital social (R$)", dados.capital_social], ["Atualização na fonte", dados.atualizado_em],
  ];
  return <details className="panel"><summary>Dados cadastrais da CNPJ.ws</summary><dl className="kv" style={{ marginTop: 16 }}>{campos.filter(([, valor]) => valor).map(([titulo, valor]) => <div key={titulo} style={{ display: "contents" }}><dt>{titulo}</dt><dd>{valor}</dd></div>)}</dl><p className="muted">{salvo ? "O retorno completo da consulta está preservado neste cadastro." : "O retorno completo da consulta será preservado no cadastro, incluindo os demais dados fornecidos pela fonte."}</p></details>;
}
