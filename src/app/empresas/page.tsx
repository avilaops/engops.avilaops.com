import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { empresasDoUsuario, exigirSessao } from "@/lib/tenant";
import { Icone } from "@/components/ui/Icones";
import NovaEmpresaForm from "@/components/NovaEmpresaForm";

export const dynamic = "force-dynamic";

/**
 * Escolha de empresa. Quem é membro de uma só é mandado direto; quem é de
 * várias (ou dono da plataforma) escolhe aqui. O dono também cria a primeira.
 */
export default async function Empresas({ searchParams }: { searchParams: Promise<{ erro?: string; criada?: string }> }) {
  const { email, dono, sessao } = await exigirSessao();
  const sp = await searchParams;
  const empresas = await empresasDoUsuario(email);
  const total = dono ? await prisma.empresa.count() : empresas.length;

  return (
    <main className="main-canvas" style={{ maxWidth: 640, margin: "0 auto" }}>
      <div className="brand-lockup" style={{ marginBottom: 24 }}>
        <span className="brand-mark"><Image src="/simbolo.png" alt="" width={22} height={22} /></span>
        <strong>EngOps</strong>
      </div>
      <div className="page-header">
        <div>
          <h1>Olá, {sessao.nome.split(" ")[0]}</h1>
          <p>{empresas.length ? "Escolha a empresa em que vai operar." : dono ? "Nenhuma empresa cadastrada ainda. Crie a primeira." : "Sua conta ainda não está ligada a nenhuma empresa. Peça a quem administra para incluir você na equipe."}</p>
        </div>
      </div>
      {sp.erro === "sem-acesso" ? <p className="form-error" style={{ marginBottom: 16 }}>Você não tem acesso a essa empresa.</p> : null}
      {sp.criada ? <p className="form-ok" style={{ marginBottom: 16 }}>Empresa criada.</p> : null}

      {empresas.length ? (
        <div className="ios-list" style={{ marginBottom: 20 }}>
          {empresas.map((e) => (
            <Link key={e.id} href={`/api/empresa/${e.id}/entrar?voltar=/demandas`} className="ios-row">
              <span className="ios-row-label">
                <strong>{e.nome}</strong>
                <small>{e.slug}{e.modoAutomacao === "SOMBRA" ? " · modo sombra" : ""}</small>
              </span>
              <Icone nome="chevron" tamanho={16} className="chevron" />
            </Link>
          ))}
        </div>
      ) : null}

      {dono ? (
        <section className="panel">
          <div className="panel-title"><h2>{total ? "Nova empresa" : "Primeira empresa"}</h2></div>
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
