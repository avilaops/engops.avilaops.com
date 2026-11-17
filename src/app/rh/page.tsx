import AppShell from "@/components/AppShell";
import {
  atualizarCargoAction,
  atualizarFuncionarioAction,
  atualizarSetorAction,
  criarCargoAction,
  criarFuncionarioAction,
  criarSetorAction,
} from "@/app/acoes/rh";
import { exigirOperador } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { exigirModulo } from "@/servicos/modulos";

export const dynamic = "force-dynamic";

export default async function RhPage({
  searchParams,
}: {
  searchParams: Promise<{ cliente?: string }>;
}) {
  const op = await exigirOperador();
  await exigirModulo(op.empresa.id, "RH");
  const sp = await searchParams;
  const clientes = await prisma.cliente.findMany({
    where: { empresaId: op.empresa.id },
    orderBy: { nome: "asc" },
  });
  const clienteId = clientes.some((cliente) => cliente.id === sp.cliente)
    ? sp.cliente!
    : clientes[0]?.id;
  const [setores, cargos, funcionarios] = await Promise.all([
    prisma.setorRh.findMany({
      where: { empresaId: op.empresa.id, clienteId },
      orderBy: { nome: "asc" },
    }),
    prisma.cargoRh.findMany({
      where: { empresaId: op.empresa.id, clienteId },
      orderBy: { nome: "asc" },
    }),
    prisma.funcionarioRh.findMany({
      where: { empresaId: op.empresa.id, clienteId },
      include: { setor: true, cargo: true },
      orderBy: { nome: "asc" },
    }),
  ]);
  return (
    <AppShell operador={op} section="rh">
      <div className="page-header">
        <div>
          <h1>Recursos Humanos</h1>
          <p>
            Estrutura e pessoas de cada empresa cliente • {funcionarios.length}{" "}
            pessoa(s)
          </p>
        </div>
      </div>
      <section className="panel" style={{ marginBottom: 16 }}>
        <label className="field">
          <span>Empresa cliente</span>
          <select value={clienteId ?? ""} onChange={undefined}>
            {!clientes.length ? (
              <option value="">
                Cadastre primeiro uma empresa em Contratantes
              </option>
            ) : (
              clientes.map((cliente) => (
                <option key={cliente.id} value={cliente.id}>
                  {cliente.nome}
                </option>
              ))
            )}
          </select>
        </label>
        {clientes.length ? (
          <div
            style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}
          >
            {clientes.map((cliente) => (
              <a
                className={
                  cliente.id === clienteId
                    ? "button"
                    : "button button-secondary"
                }
                key={cliente.id}
                href={`/rh?cliente=${cliente.id}`}
              >
                {cliente.nome}
              </a>
            ))}
          </div>
        ) : null}
      </section>
      {!clienteId ? (
        <section className="panel">
          <p className="muted">
            Cadastre uma empresa cliente antes de cadastrar seus setores, cargos
            e funcionários.
          </p>
        </section>
      ) : (
        <>
          <div className="grid-2">
            <section className="panel">
              <div className="panel-title">
                <h2>Novo setor</h2>
              </div>
              <form action={criarSetorAction} className="form-stack">
                <input type="hidden" name="clienteId" value={clienteId} />
                <input name="nome" placeholder="Nome do setor" required />
                <textarea name="descricao" placeholder="Descrição" />
                <button className="button" type="submit">
                  Cadastrar setor
                </button>
              </form>
            </section>
            <section className="panel">
              <div className="panel-title">
                <h2>Novo cargo</h2>
              </div>
              <form action={criarCargoAction} className="form-stack">
                <input type="hidden" name="clienteId" value={clienteId} />
                <input name="nome" placeholder="Nome do cargo" required />
                <input name="cbo" placeholder="CBO" />
                <textarea name="descricao" placeholder="Descrição" />
                <button className="button" type="submit">
                  Cadastrar cargo
                </button>
              </form>
            </section>
          </div>
          <div className="grid-2" style={{ marginTop: 16 }}>
            <section className="panel">
              <h2>Setores cadastrados</h2>
              <div className="ios-list" style={{ marginTop: 10 }}>
                {setores.map((setor) => (
                  <details
                    className="ios-row"
                    key={setor.id}
                    style={{ display: "block" }}
                  >
                    <summary>
                      <strong>{setor.nome}</strong> •{" "}
                      {setor.ativo ? "Ativo" : "Inativo"}
                    </summary>
                    <form
                      action={atualizarSetorAction}
                      className="form-stack"
                      style={{ marginTop: 10 }}
                    >
                      <input type="hidden" name="id" value={setor.id} />
                      <input type="hidden" name="clienteId" value={clienteId} />
                      <input name="nome" defaultValue={setor.nome} required />
                      <textarea
                        name="descricao"
                        defaultValue={setor.descricao ?? ""}
                        placeholder="Descrição"
                      />
                      <select name="ativo" defaultValue={String(setor.ativo)}>
                        <option value="true">Ativo</option>
                        <option value="false">Inativo</option>
                      </select>
                      <button className="button button-secondary">
                        Salvar setor
                      </button>
                    </form>
                  </details>
                ))}
              </div>
            </section>
            <section className="panel">
              <h2>Cargos cadastrados</h2>
              <div className="ios-list" style={{ marginTop: 10 }}>
                {cargos.map((cargo) => (
                  <details
                    className="ios-row"
                    key={cargo.id}
                    style={{ display: "block" }}
                  >
                    <summary>
                      <strong>{cargo.nome}</strong> •{" "}
                      {cargo.ativo ? "Ativo" : "Inativo"}
                    </summary>
                    <form
                      action={atualizarCargoAction}
                      className="form-stack"
                      style={{ marginTop: 10 }}
                    >
                      <input type="hidden" name="id" value={cargo.id} />
                      <input type="hidden" name="clienteId" value={clienteId} />
                      <input name="nome" defaultValue={cargo.nome} required />
                      <input
                        name="cbo"
                        defaultValue={cargo.cbo ?? ""}
                        placeholder="CBO"
                      />
                      <textarea
                        name="descricao"
                        defaultValue={cargo.descricao ?? ""}
                        placeholder="Descrição"
                      />
                      <select name="ativo" defaultValue={String(cargo.ativo)}>
                        <option value="true">Ativo</option>
                        <option value="false">Inativo</option>
                      </select>
                      <button className="button button-secondary">
                        Salvar cargo
                      </button>
                    </form>
                  </details>
                ))}
              </div>
            </section>
          </div>
          <section className="panel" style={{ marginTop: 16 }}>
            <div className="panel-title">
              <h2>Novo funcionário</h2>
            </div>
            <form action={criarFuncionarioAction} className="form-stack">
              <input type="hidden" name="clienteId" value={clienteId} />
              <input name="nome" placeholder="Nome completo" required />
              <input name="cpf" placeholder="CPF" required />
              <input name="matricula" placeholder="Matrícula" />
              <input name="email" type="email" placeholder="E-mail" />
              <select name="setorId" required>
                <option value="">Setor</option>
                {setores
                  .filter((s) => s.ativo)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nome}
                    </option>
                  ))}
              </select>
              <select name="cargoId" required>
                <option value="">Cargo</option>
                {cargos
                  .filter((c) => c.ativo)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
              </select>
              <button className="button" type="submit">
                Cadastrar funcionário
              </button>
            </form>
          </section>
          <div className="ios-list" style={{ marginTop: 16 }}>
            {funcionarios.map((f) => (
              <details
                key={f.id}
                className="ios-row"
                style={{ display: "block" }}
              >
                <summary>
                  <strong>{f.nome}</strong> • {f.status}
                  <small style={{ display: "block" }}>
                    {f.setor.nome} • {f.cargo.nome} • {f.cpf}
                  </small>
                </summary>
                <form
                  action={atualizarFuncionarioAction}
                  className="form-stack"
                  style={{ marginTop: 12 }}
                >
                  <input type="hidden" name="id" value={f.id} />
                  <input type="hidden" name="clienteId" value={clienteId} />
                  <input name="nome" defaultValue={f.nome} required />
                  <input
                    name="matricula"
                    defaultValue={f.matricula ?? ""}
                    placeholder="Matrícula"
                  />
                  <input
                    name="email"
                    type="email"
                    defaultValue={f.email ?? ""}
                    placeholder="E-mail"
                  />
                  <input
                    name="telefone"
                    defaultValue={f.telefone ?? ""}
                    placeholder="Telefone"
                  />
                  <select name="status" defaultValue={f.status}>
                    <option value="ATIVO">Ativo</option>
                    <option value="AFASTADO">Afastado</option>
                    <option value="DESLIGADO">Desligado</option>
                  </select>
                  <button className="button button-secondary">
                    Salvar alterações
                  </button>
                </form>
              </details>
            ))}
          </div>
        </>
      )}
    </AppShell>
  );
}
