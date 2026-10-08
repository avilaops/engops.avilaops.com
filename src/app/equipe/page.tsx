import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import EquipeForm from "@/components/EquipeForm";
import { exigirOperador } from "@/lib/tenant";
import { pode, nomeDoPapel } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { dataHora } from "@/lib/formatos";

export const dynamic = "force-dynamic";

export default async function Equipe() {
  const op = await exigirOperador();
  if (!pode(op.papel, "empresa.administrar")) redirect("/demandas");
  const membros = await prisma.membro.findMany({ where: { empresaId: op.empresa.id }, orderBy: [{ ativo: "desc" }, { nome: "asc" }] });
  return (
    <AppShell operador={op} section="equipe">
      <div className="page-header"><div><h1>Equipe</h1><p>Quem entra em {op.empresa.nome} e com qual papel. A pessoa faz login pelo login único da Ávila Ops com o e-mail cadastrado aqui.</p></div></div>
      <div className="grid-2">
        <section className="panel">
          <div className="panel-title"><h2>Membros</h2></div>
          <EquipeForm membros={membros.map((m) => ({ id: m.id, email: m.email, nome: m.nome, papel: m.papel, papelNome: nomeDoPapel(m.papel), ativo: m.ativo, ultimoAcesso: dataHora(m.ultimoAcessoEm) }))} meuEmail={op.email} />
        </section>
        <section className="panel">
          <div className="panel-title"><h2>Papéis</h2></div>
          <dl className="kv">
            <dt>Administrador</dt><dd>Tudo, inclusive equipe e empresa.</dd>
            <dt>Gestor</dt><dd>Opera, aprova e vê relatórios. Não administra equipe.</dd>
            <dt>Operador</dt><dd>Cria demandas, envia documentos, prepara e executa. Não aprova.</dd>
            <dt>Revisor</dt><dd>Confere, resolve pendências e aprova. Não cria.</dd>
            <dt>Consulta</dt><dd>Só lê.</dd>
          </dl>
        </section>
      </div>
    </AppShell>
  );
}
