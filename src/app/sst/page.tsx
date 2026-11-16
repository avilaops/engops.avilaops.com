import AppShell from "@/components/AppShell";
import { adicionarParticipanteAction, criarNormaAction, criarTreinamentoAction } from "@/app/acoes/sst";
import { exigirOperador } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { exigirModulo } from "@/servicos/modulos";

export const dynamic = "force-dynamic";
export default async function SstPage() {
  const op = await exigirOperador(); await exigirModulo(op.empresa.id, "SST");
  const [normas, treinamentos, funcionarios, ordens, certificados] = await Promise.all([
    prisma.normaSst.findMany({ where: { empresaId: op.empresa.id }, orderBy: { codigo: "asc" } }),
    prisma.treinamentoSst.findMany({ where: { empresaId: op.empresa.id }, include: { norma: true, participantes: { include: { funcionario: true } } }, orderBy: { inicio: "desc" } }),
    prisma.funcionarioRh.findMany({ where: { empresaId: op.empresa.id, status: "ATIVO" }, orderBy: { nome: "asc" } }),
    prisma.ordemServicoSst.count({ where: { empresaId: op.empresa.id } }), prisma.certificadoSst.count({ where: { empresaId: op.empresa.id } }),
  ]);
  return <AppShell operador={op} section="sst"><div className="page-header"><div><h1>Segurança do Trabalho</h1><p>Normas, treinamentos, certificados, listas e ordens de serviço</p></div></div>
    <div className="grid-2"><section className="panel"><h2>Nova norma</h2><form action={criarNormaAction} className="form-stack"><input name="codigo" placeholder="NR 01" required /><input name="titulo" placeholder="Título" required /><button className="button">Cadastrar norma</button></form></section><section className="panel"><h2>Novo treinamento</h2><form action={criarTreinamentoAction} className="form-stack"><input name="titulo" placeholder="Título" required /><input name="inicio" type="datetime-local" required /><input name="instrutor" placeholder="Instrutor" /><input name="validadeMeses" type="number" min="1" placeholder="Validade em meses" /><select name="normaId"><option value="">Sem norma</option>{normas.map(n => <option key={n.id} value={n.id}>{n.codigo} • {n.titulo}</option>)}</select><button className="button">Agendar treinamento</button></form></section></div>
    <p className="muted" style={{ marginTop: 16 }}>{normas.length} norma(s) • {treinamentos.length} treinamento(s) • {certificados} certificado(s) • {ordens} ordem(ns)</p>
    <div className="ios-list">{treinamentos.map(t => <div className="ios-row" key={t.id} style={{ display: "block" }}><strong>{t.titulo}</strong><small>{t.inicio.toLocaleString("pt-BR")} • {t.norma?.codigo ?? "sem NR"}</small><form action={adicionarParticipanteAction} style={{ display: "flex", gap: 8, marginTop: 8 }}><input type="hidden" name="treinamentoId" value={t.id} /><select name="funcionarioId" required><option value="">Adicionar participante</option>{funcionarios.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}</select><button className="button button-secondary">Adicionar</button></form><small>{t.participantes.map(p => p.funcionario.nome).join(" • ") || "Sem participantes"}</small></div>)}</div>
  </AppShell>;
}
