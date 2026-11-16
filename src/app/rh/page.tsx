import AppShell from "@/components/AppShell";
import { criarCargoAction, criarFuncionarioAction, criarSetorAction } from "@/app/acoes/rh";
import { exigirOperador } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { exigirModulo } from "@/servicos/modulos";

export const dynamic = "force-dynamic";

export default async function RhPage() {
  const op = await exigirOperador();
  await exigirModulo(op.empresa.id, "RH");
  const [setores, cargos, funcionarios] = await Promise.all([
    prisma.setorRh.findMany({ where: { empresaId: op.empresa.id, ativo: true }, orderBy: { nome: "asc" } }),
    prisma.cargoRh.findMany({ where: { empresaId: op.empresa.id, ativo: true }, orderBy: { nome: "asc" } }),
    prisma.funcionarioRh.findMany({ where: { empresaId: op.empresa.id }, include: { setor: true, cargo: true }, orderBy: { nome: "asc" } }),
  ]);
  return <AppShell operador={op} section="rh">
    <div className="page-header"><div><h1>Recursos Humanos</h1><p>Setores, cargos e funcionários • {funcionarios.length} pessoa(s)</p></div></div>
    <div className="grid-2">
      <section className="panel"><div className="panel-title"><h2>Novo setor</h2></div><form action={criarSetorAction} className="form-stack"><input name="nome" placeholder="Nome do setor" required /><textarea name="descricao" placeholder="Descrição" /><button className="button" type="submit">Cadastrar setor</button></form></section>
      <section className="panel"><div className="panel-title"><h2>Novo cargo</h2></div><form action={criarCargoAction} className="form-stack"><input name="nome" placeholder="Nome do cargo" required /><input name="cbo" placeholder="CBO" /><textarea name="descricao" placeholder="Descrição" /><button className="button" type="submit">Cadastrar cargo</button></form></section>
    </div>
    <section className="panel" style={{ marginTop: 16 }}><div className="panel-title"><h2>Novo funcionário</h2></div><form action={criarFuncionarioAction} className="form-stack"><input name="nome" placeholder="Nome completo" required /><input name="cpf" placeholder="CPF" required /><input name="matricula" placeholder="Matrícula" /><input name="email" type="email" placeholder="E-mail" /><select name="setorId" required><option value="">Setor</option>{setores.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}</select><select name="cargoId" required><option value="">Cargo</option>{cargos.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}</select><button className="button" type="submit">Cadastrar funcionário</button></form></section>
    <div className="ios-list" style={{ marginTop: 16 }}>{funcionarios.map(f => <div className="ios-row" key={f.id}><span className="ios-row-label"><strong>{f.nome}</strong><small>{f.setor.nome} • {f.cargo.nome} • {f.cpf}</small></span><span className="ios-row-value">{f.status}</span></div>)}</div>
  </AppShell>;
}
