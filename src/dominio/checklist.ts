import type { EstadoItem, GrupoChecklist, StatusDemanda } from "@prisma/client";
import type { Problema } from "@/dominio/validacao";

/**
 * O checklist não é uma lista que a pessoa marca: é calculado do estado real
 * da demanda (documentos presentes, pendências, execuções). Marcar à mão
 * seria mentir para o próprio sistema.
 */

export type ItemCalculado = {
  grupo: GrupoChecklist;
  chave: string;
  rotulo: string;
  estado: EstadoItem;
  ordem: number;
  detalhe?: string;
};

export type EntradaChecklist = {
  status: StatusDemanda;
  documentosPorTipo: Set<string>;
  problemas: Problema[];
  execucoes: Array<{ sistema: "SIMIL" | "RAE" | "SIOPI"; status: string }>;
  temPacoteFinal: boolean;
};

export const GRUPOS: ReadonlyArray<readonly [GrupoChecklist, string]> = [
  ["DOCUMENTOS", "Documentos"],
  ["DADOS", "Dados"],
  ["SIMIL", "SIMIL"],
  ["RAE", "RAE"],
  ["SIOPI", "SIOPI"],
  ["ENTREGA", "Entrega"],
];

export function nomeDoGrupo(g: GrupoChecklist): string {
  return GRUPOS.find(([k]) => k === g)?.[1] ?? g;
}

export function calcularChecklist(e: EntradaChecklist): ItemCalculado[] {
  const itens: ItemCalculado[] = [];
  let ordem = 0;
  const add = (grupo: GrupoChecklist, chave: string, rotulo: string, estado: EstadoItem, detalhe?: string) =>
    itens.push({ grupo, chave, rotulo, estado, ordem: ordem++, detalhe });

  const bloqueiaDoc = (tipo: string) => e.problemas.find((p) => p.codigo === `DOC_${tipo}_AUSENTE`);
  const docItem = (tipo: string, rotulo: string, obrigatorio: boolean) => {
    if (e.documentosPorTipo.has(tipo)) {
      const div = e.problemas.find((p) => p.origem === "CRUZADO" && p.titulo.includes(tipo));
      add("DOCUMENTOS", `doc.${tipo}`, rotulo, div ? "REVISAR" : "OK", div?.titulo);
    } else {
      add("DOCUMENTOS", `doc.${tipo}`, rotulo, obrigatorio && bloqueiaDoc(tipo) ? "BLOQUEADO" : "PENDENTE");
    }
  };
  docItem("OS", "Ordem de Serviço", true);
  docItem("MATRICULA", "Matrícula do imóvel", true);
  docItem("DOC_PROPRIETARIO", "Documento do proprietário", true);
  docItem("FOTO", "Fotos do imóvel", false);

  const bloqueiosDados = e.problemas.filter((p) => p.origem === "DETECTOR" && !p.codigo.startsWith("DOC_") && p.severidade === "BLOQUEIA");
  const avisosDados = e.problemas.filter((p) => p.origem === "DETECTOR" && !p.codigo.startsWith("DOC_") && p.severidade === "AVISO");
  const divergencias = e.problemas.filter((p) => p.origem === "CRUZADO");
  add(
    "DADOS",
    "dados.cadastro",
    "Cadastro completo",
    bloqueiosDados.length ? "BLOQUEADO" : avisosDados.length ? "REVISAR" : "OK",
    bloqueiosDados.length ? `${bloqueiosDados.length} campo(s) obrigatório(s) faltando` : avisosDados.length ? `${avisosDados.length} aviso(s)` : undefined,
  );
  add(
    "DADOS",
    "dados.cruzado",
    "Sem divergência entre documentos",
    divergencias.some((d) => d.severidade === "BLOQUEIA") ? "BLOQUEADO" : divergencias.length ? "REVISAR" : "OK",
    divergencias.length ? `${divergencias.length} divergência(s)` : undefined,
  );

  const exec = (sistema: "SIMIL" | "RAE" | "SIOPI") => e.execucoes.filter((x) => x.sistema === sistema);
  const estadoExec = (sistema: "SIMIL" | "RAE" | "SIOPI"): { prep: EstadoItem; done: EstadoItem } => {
    const xs = exec(sistema);
    const concluida = xs.some((x) => x.status === "CONCLUIDA");
    const preparada = xs.some((x) => x.status === "PREPARADA" || x.status === "AGUARDANDO_APROVACAO" || x.status === "EXECUTANDO");
    const falhou = xs.length > 0 && xs.every((x) => x.status === "FALHOU" || x.status === "CANCELADA");
    return {
      prep: concluida || preparada ? "OK" : falhou ? "REVISAR" : "PENDENTE",
      done: concluida ? "OK" : falhou ? "REVISAR" : "PENDENTE",
    };
  };

  const s = estadoExec("SIMIL");
  add("SIMIL", "simil.preparar", "Formulário preparado", s.prep);
  add("SIMIL", "simil.enviar", "Enviado ao SIMIL", s.done);
  const r = estadoExec("RAE");
  add("RAE", "rae.gerar", "RAE gerado", r.done);
  const o = estadoExec("SIOPI");
  add("SIOPI", "siopi.executar", "SIOPI concluído", o.done);

  add("ENTREGA", "entrega.pacote", "Pacote final montado", e.temPacoteFinal ? "OK" : "PENDENTE");
  add("ENTREGA", "entrega.revisao", "Revisão final", e.status === "PRONTA_PARA_ENTREGA" || e.status === "ENTREGUE" || e.status === "ARQUIVADA" ? "OK" : "PENDENTE");
  add("ENTREGA", "entrega.finalizar", "Entregue", e.status === "ENTREGUE" || e.status === "ARQUIVADA" ? "OK" : "PENDENTE");

  return itens;
}

/** Próxima ação sugerida a partir do checklist e do estado. Uma só, em português. */
export function proximaAcao(e: EntradaChecklist): { titulo: string; acao: "completar" | "documentos" | "resolver" | "preparar-simil" | "aprovar" | "revisar-sombra" | "gerar-rae" | "executar-siopi" | "conferir" | "entregar" | "nada" } {
  const bloqueios = e.problemas.filter((p) => p.severidade === "BLOQUEIA");
  if (e.status === "ENTREGUE" || e.status === "ARQUIVADA") return { titulo: "Demanda concluída.", acao: "nada" };
  if (bloqueios.some((p) => p.codigo.startsWith("DOC_"))) return { titulo: "Faltam documentos obrigatórios.", acao: "documentos" };
  if (bloqueios.some((p) => p.origem === "CRUZADO")) return { titulo: "Há divergência entre documentos. Resolva antes de seguir.", acao: "resolver" };
  if (bloqueios.length) return { titulo: "Complete o cadastro da demanda.", acao: "completar" };

  const simil = e.execucoes.filter((x) => x.sistema === "SIMIL");
  const similOk = simil.some((x) => x.status === "CONCLUIDA");
  if (!similOk) {
    if (simil.some((x) => x.status === "AGUARDANDO_APROVACAO")) return { titulo: "SIMIL preparado. Aguardando aprovação.", acao: "aprovar" };
    if (simil.some((x) => x.status === "PREPARADA")) return { titulo: "SIMIL preparado em modo sombra. Compare com o manual e confirme.", acao: "revisar-sombra" };
    return { titulo: "Tudo pronto para preparar o SIMIL.", acao: "preparar-simil" };
  }
  const raeOk = e.execucoes.some((x) => x.sistema === "RAE" && x.status === "CONCLUIDA");
  if (!raeOk) return { titulo: "SIMIL concluído. Gerar o RAE.", acao: "gerar-rae" };
  const siopiOk = e.execucoes.some((x) => x.sistema === "SIOPI" && x.status === "CONCLUIDA");
  if (!siopiOk) return { titulo: "RAE gerado. Executar o SIOPI.", acao: "executar-siopi" };
  if (e.status !== "PRONTA_PARA_ENTREGA") return { titulo: "Conferir e liberar para entrega.", acao: "conferir" };
  return { titulo: "Pronta para entrega.", acao: "entregar" };
}
