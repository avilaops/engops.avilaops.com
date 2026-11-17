import Image from "next/image";
import Link from "next/link";
import { empresasDoUsuario, exigirSessao } from "@/lib/tenant";
import { Icone } from "@/components/ui/Icones";
import NovaEmpresaForm from "@/components/NovaEmpresaForm";
import ModulosEmpresaForm from "@/components/ModulosEmpresaForm";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** Escolha de tenant e primeiro acesso SaaS para contas sem empresa. */
export default async function Empresas({ searchParams }: { searchParams: Promise<{ erro?: string; criada?: string }> }) {
  const { email, dono, sessao } = await exigirSessao();
  const sp = await searchParams;
  const empresas = await empresasDoUsuario(email);
  const modulos = dono ? await prisma.moduloEmpresa.findMany({
    where: { empresaId: { in: empresas.map((empresa) => empresa.id) }, ativo: true },
    select: { empresaId: true, modulo: true },
  }) : [];

  return (
    <main className="main-canvas" style={{ maxWidth: 640, margin: "0 auto" }}>
      <div className="brand-lockup" style={{ marginBottom: 24 }}>
        <span className="brand-mark"><Image src="/simbolo.png" alt="" width={22} height={22} /></span>
        <strong>EngOps</strong>
      </div>
      {empresas.length ? (
        <div className="page-header">
          <div>
            <h1>Olá, {sessao.nome.split(" ")[0]}</h1>
            <p>Escolha o espaço da empresa em que vai operar.</p>
          </div>
        </div>
      ) : (
        <section style={{ marginBottom: 20 }}>
          <p className="subtle" style={{ marginBottom: 6 }}>Seu espaço de trabalho começa aqui</p>
          <h1>Crie a empresa da sua equipe</h1>
          <p className="muted" style={{ marginTop: 8 }}>
            Organize demandas, documentos e operações da Caixa em um ambiente próprio. Você será a pessoa administradora inicial e poderá convidar sua equipe depois.
          </p>
        </section>
      )}
      {sp.erro === "sem-acesso" ? <p className="form-error" style={{ marginBottom: 16 }}>Você não tem acesso a essa empresa.</p> : null}
      {sp.criada ? <p className="form-ok" style={{ marginBottom: 16 }}>Empresa criada.</p> : null}

      {empresas.length ? (
        <div className="ios-list" style={{ marginBottom: 20 }}>
          {empresas.map((e) => (
            <div key={e.id} className="ios-row" style={{ display: "block" }}>
              <Link href={`/api/empresa/${e.id}/entrar?voltar=/demandas`} style={{ display: "flex", alignItems: "center" }}>
                <span className="ios-row-label">
                  <strong>{e.nome}</strong>
                  <small>{e.slug}{e.modoAutomacao === "SOMBRA" ? " • modo sombra" : ""}</small>
                </span>
                <Icone nome="chevron" tamanho={16} className="chevron" />
              </Link>
              {dono ? <ModulosEmpresaForm empresaId={e.id} ativos={modulos.filter((modulo) => modulo.empresaId === e.id).map((modulo) => modulo.modulo)} /> : null}
            </div>
          ))}
        </div>
      ) : null}

      {!empresas.length || dono ? (
        <section className="panel">
          <div className="panel-title"><h2>{empresas.length ? "Nova empresa" : "Dados da empresa"}</h2></div>
          {!empresas.length ? <p className="muted" style={{ marginBottom: 16 }}>Cadastre os dados básicos para abrir seu espaço no EngOps. O cadastro cria uma empresa nova e não associa sua conta a empresas já existentes.</p> : null}
          <NovaEmpresaForm />
        </section>
      ) : null}

      <div className="subtle" style={{ marginTop: 20, display: "flex", gap: 6, alignItems: "center" }}>
        <span>Logado como {email}.</span>
        <form action="/api/auth/logout" method="post"><button type="submit" className="text-button" style={{ padding: 0 }}>Sair</button></form>
      </div>
    </main>
  );
}
