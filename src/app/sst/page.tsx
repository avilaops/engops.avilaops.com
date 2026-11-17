import Link from "next/link";
import AppShell from "@/components/AppShell";
import {
  adicionarParticipanteAction,
  atualizarConteudoNormaAction,
  atualizarParticipanteAction,
  atualizarPresencaEmMassaAction,
  atualizarStatusOrdemServicoAction,
  atualizarStatusTreinamentoAction,
  atualizarTreinamentoAction,
  criarNormaAction,
  criarOrdemServicoAction,
  criarTreinamentoAction,
  emitirCertificadoAction,
  enviarCertificadoEmailAction,
  invalidarCertificadoAction,
  sincronizarNormasAction,
} from "@/app/acoes/sst";
import { exigirOperador } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { exigirModulo } from "@/servicos/modulos";
import { podeAlterarPessoas } from "@/dominio/modulos";
import { emailSstConfigurado } from "@/servicos/email";

export const dynamic = "force-dynamic";

function dataHoraInputSaoPaulo(data: Date) {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(data);
  const obter = (tipo: string) =>
    partes.find((parte) => parte.type === tipo)?.value ?? "";
  return `${obter("year")}-${obter("month")}-${obter("day")}T${obter("hour")}:${obter("minute")}`;
}

function HistoricoCertificado({
  emissoes,
}: {
  emissoes: Array<{
    id: string;
    versao: number;
    status: string;
    emitidoEm: Date;
  }>;
}) {
  if (!emissoes.length) return null;
  return (
    <details style={{ marginTop: 8 }}>
      <summary>Histórico • {emissoes.length} emissão(ões)</summary>
      <div className="ios-list" style={{ marginTop: 8 }}>
        {emissoes.map((emissao) => (
          <div className="ios-row" key={emissao.id}>
            <span>
              Versão {emissao.versao} • {emissao.status} •{" "}
              {emissao.emitidoEm.toLocaleDateString("pt-BR", {
                timeZone: "America/Sao_Paulo",
              })}
            </span>
            <Link
              className="button button-secondary"
              href={`/api/sst/certificados/emissoes/${emissao.id}/pdf`}
              target="_blank"
            >
              Abrir PDF
            </Link>
          </div>
        ))}
      </div>
    </details>
  );
}

export default async function SstPage({
  searchParams,
}: {
  searchParams: Promise<{ cliente?: string }>;
}) {
  const op = await exigirOperador();
  await exigirModulo(op.empresa.id, "SST");
  const podeAlterar = podeAlterarPessoas(op.papel);
  const emailConfigurado = emailSstConfigurado();
  const sp = await searchParams;
  const clientes = await prisma.cliente.findMany({
    where: { empresaId: op.empresa.id },
    orderBy: { nome: "asc" },
  });
  const clienteId = clientes.some((cliente) => cliente.id === sp.cliente)
    ? sp.cliente!
    : clientes[0]?.id;
  const [normas, treinamentos, funcionarios, ordens, certificados] =
    await Promise.all([
      prisma.normaSst.findMany({
        where: { empresaId: op.empresa.id },
        orderBy: { codigo: "asc" },
      }),
      prisma.treinamentoSst.findMany({
        where: { empresaId: op.empresa.id, clienteId },
        include: {
          norma: true,
          participantes: {
            include: {
              funcionario: true,
              certificado: true,
              emissoes: { orderBy: { versao: "desc" } },
            },
          },
        },
        orderBy: { inicio: "desc" },
      }),
      prisma.funcionarioRh.findMany({
        where: { empresaId: op.empresa.id, clienteId, status: "ATIVO" },
        orderBy: { nome: "asc" },
      }),
      prisma.ordemServicoSst.findMany({
        where: { empresaId: op.empresa.id, clienteId },
        include: { funcionario: true },
        orderBy: { emitidaEm: "desc" },
      }),
      prisma.certificadoSst.count({
        where: { empresaId: op.empresa.id, clienteId, status: "ATIVO" },
      }),
    ]);
  const cliente = clientes.find((item) => item.id === clienteId);

  return (
    <AppShell operador={op} section="sst">
      <div className="page-header">
        <div>
          <h1>Segurança do Trabalho</h1>
          <p>
            {cliente ? `${cliente.nome} • ` : ""}normas, treinamentos,
            certificados, listas e ordens de serviço
          </p>
        </div>
        <Link
          href={`/sst/templates${clienteId ? `?cliente=${clienteId}` : ""}`}
          className="button button-secondary"
        >
          Ver 38 modelos
        </Link>
      </div>

      <section className="panel" style={{ marginBottom: 16 }}>
        <strong>Empresa cliente</strong>
        <div
          style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}
        >
          {clientes.length ? (
            clientes.map((item) => (
              <Link
                className={
                  item.id === clienteId ? "button" : "button button-secondary"
                }
                href={`/sst?cliente=${item.id}`}
                key={item.id}
              >
                {item.nome}
              </Link>
            ))
          ) : (
            <Link href="/clientes" className="button">
              Cadastrar empresa cliente
            </Link>
          )}
        </div>
      </section>

      {!clienteId ? (
        <section className="panel">
          <p className="muted">
            Cadastre uma empresa cliente para começar a operação SST.
          </p>
        </section>
      ) : (
        <>
          <div className="grid-2">
            <section className="panel">
              <h2>Catálogo de normas</h2>
              <p className="muted">{normas.length} de 38 NRs carregadas.</p>
              {podeAlterar && normas.length < 38 ? (
                <form action={sincronizarNormasAction}>
                  <button className="button" style={{ marginTop: 12 }}>
                    Carregar catálogo das 38 NRs
                  </button>
                </form>
              ) : null}
              {podeAlterar ? (
                <>
                  <details style={{ marginTop: 12 }}>
                    <summary>Editar conteúdo programático</summary>
                    <form
                      action={atualizarConteudoNormaAction}
                      className="form-stack"
                      style={{ marginTop: 12 }}
                    >
                      <select name="normaId" required>
                        <option value="">Selecione a norma</option>
                        {normas.map((n) => (
                          <option key={n.id} value={n.id}>
                            {n.codigo} • {n.titulo}
                          </option>
                        ))}
                      </select>
                      <textarea
                        name="textoReferencia"
                        rows={8}
                        placeholder="Um tópico por linha"
                        required
                      />
                      <button className="button button-secondary">
                        Salvar conteúdo
                      </button>
                    </form>
                  </details>
                  <details style={{ marginTop: 12 }}>
                    <summary>Cadastrar manualmente</summary>
                    <form
                      action={criarNormaAction}
                      className="form-stack"
                      style={{ marginTop: 12 }}
                    >
                      <input name="codigo" placeholder="NR 01" required />
                      <input name="titulo" placeholder="Título" required />
                      <button className="button button-secondary">
                        Cadastrar norma
                      </button>
                    </form>
                  </details>
                </>
              ) : null}
            </section>
            {podeAlterar ? (
              <section className="panel">
                <h2>Novo treinamento</h2>
                <form action={criarTreinamentoAction} className="form-stack">
                  <input type="hidden" name="clienteId" value={clienteId} />
                  <input name="titulo" placeholder="Título" required />
                  <input name="inicio" type="datetime-local" required />
                  <input name="instrutor" placeholder="Instrutor" />
                  <div className="field-grid">
                    <input
                      name="cargaHorariaMin"
                      type="number"
                      min="1"
                      placeholder="Carga em minutos"
                    />
                    <input
                      name="validadeMeses"
                      type="number"
                      min="1"
                      placeholder="Validade em meses"
                    />
                  </div>
                  <select name="normaId">
                    <option value="">Sem norma</option>
                    {normas
                      .filter((n) => n.ativo)
                      .map((n) => (
                        <option key={n.id} value={n.id}>
                          {n.codigo} • {n.titulo}
                        </option>
                      ))}
                  </select>
                  <button className="button">Agendar treinamento</button>
                </form>
              </section>
            ) : null}
          </div>

          <div className="grid-3" style={{ marginTop: 16 }}>
            <section className="panel">
              <strong>{funcionarios.length}</strong>
              <p className="muted">funcionários ativos</p>
            </section>
            <section className="panel">
              <strong>{treinamentos.length}</strong>
              <p className="muted">treinamentos</p>
            </section>
            <section className="panel">
              <strong>{certificados}</strong>
              <p className="muted">certificados ativos</p>
            </section>
          </div>

          <section style={{ marginTop: 16 }}>
            <h2>Treinamentos</h2>
            <div className="ios-list" style={{ marginTop: 10 }}>
              {!treinamentos.length ? (
                <div className="ios-row">
                  <span className="muted">
                    Nenhum treinamento para esta empresa.
                  </span>
                </div>
              ) : (
                treinamentos.map((t) => (
                  <details
                    className="ios-row"
                    key={t.id}
                    style={{ display: "block" }}
                  >
                    <summary>
                      <strong>{t.titulo}</strong>
                      <small style={{ display: "block" }}>
                        {t.inicio.toLocaleString("pt-BR", {
                          timeZone: "America/Sao_Paulo",
                        })}{" "}
                        • {t.norma?.codigo ?? "sem NR"} • {t.status}
                      </small>
                    </summary>
                    <div
                      style={{
                        marginTop: 12,
                        display: "flex",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      <Link
                        className="button button-secondary"
                        href={`/api/sst/treinamentos/${t.id}/lista`}
                        target="_blank"
                      >
                        Lista em PDF
                      </Link>
                      {podeAlterar && t.status === "PLANEJADO" ? (
                        <form
                          action={atualizarStatusTreinamentoAction}
                          style={{ display: "contents" }}
                        >
                          <input
                            type="hidden"
                            name="treinamentoId"
                            value={t.id}
                          />
                          <button
                            className="button button-secondary"
                            name="status"
                            value="REALIZADO"
                          >
                            Concluir
                          </button>
                          <button
                            className="button button-ghost"
                            name="status"
                            value="CANCELADO"
                          >
                            Cancelar
                          </button>
                        </form>
                      ) : null}
                    </div>
                    {podeAlterar && t.status === "PLANEJADO" ? (
                      <details style={{ marginTop: 12 }}>
                        <summary>Editar treinamento</summary>
                        <form
                          action={atualizarTreinamentoAction}
                          className="form-stack"
                          style={{ marginTop: 10 }}
                        >
                          <input
                            type="hidden"
                            name="treinamentoId"
                            value={t.id}
                          />
                          <input
                            type="hidden"
                            name="clienteId"
                            value={clienteId}
                          />
                          <input
                            name="titulo"
                            defaultValue={t.titulo}
                            required
                          />
                          <input
                            name="inicio"
                            type="datetime-local"
                            defaultValue={dataHoraInputSaoPaulo(t.inicio)}
                            required
                          />
                          <input
                            name="instrutor"
                            defaultValue={t.instrutor ?? ""}
                            placeholder="Instrutor"
                          />
                          <div className="field-grid">
                            <input
                              name="cargaHorariaMin"
                              type="number"
                              min="1"
                              defaultValue={t.cargaHorariaMin ?? ""}
                              placeholder="Carga em minutos"
                            />
                            <input
                              name="validadeMeses"
                              type="number"
                              min="1"
                              defaultValue={t.validadeMeses ?? ""}
                              placeholder="Validade em meses"
                            />
                          </div>
                          <select name="normaId" defaultValue={t.normaId ?? ""}>
                            <option value="">Sem norma</option>
                            {normas
                              .filter((n) => n.ativo)
                              .map((n) => (
                                <option key={n.id} value={n.id}>
                                  {n.codigo} • {n.titulo}
                                </option>
                              ))}
                          </select>
                          <button className="button button-secondary">
                            Salvar treinamento
                          </button>
                        </form>
                      </details>
                    ) : null}
                    {podeAlterar && t.status !== "CANCELADO" ? (
                      <form
                        action={adicionarParticipanteAction}
                        style={{ display: "flex", gap: 8, marginTop: 12 }}
                      >
                        <input
                          type="hidden"
                          name="treinamentoId"
                          value={t.id}
                        />
                        <select name="funcionarioId" required>
                          <option value="">Adicionar participante</option>
                          {funcionarios
                            .filter(
                              (f) =>
                                !t.participantes.some(
                                  (p) => p.funcionarioId === f.id,
                                ),
                            )
                            .map((f) => (
                              <option key={f.id} value={f.id}>
                                {f.nome}
                              </option>
                            ))}
                        </select>
                        <button className="button button-secondary">
                          Adicionar
                        </button>
                      </form>
                    ) : null}
                    {podeAlterar &&
                    t.participantes.length &&
                    t.status !== "CANCELADO" ? (
                      <form
                        action={atualizarPresencaEmMassaAction}
                        style={{
                          display: "flex",
                          gap: 8,
                          marginTop: 10,
                          flexWrap: "wrap",
                        }}
                      >
                        <input
                          type="hidden"
                          name="treinamentoId"
                          value={t.id}
                        />
                        <select name="resultado" required>
                          <option value="PRESENTE_APROVADO">
                            Todos presentes e aprovados
                          </option>
                          <option value="PRESENTE">Todos presentes</option>
                          <option value="AUSENTE">Marcar todos ausentes</option>
                        </select>
                        <button className="button button-secondary">
                          Aplicar em massa
                        </button>
                      </form>
                    ) : null}
                    <div style={{ marginTop: 12 }}>
                      {t.participantes.map((p) => (
                        <div
                          key={p.id}
                          style={{
                            padding: "12px 0",
                            borderTop: "1px solid var(--border)",
                          }}
                        >
                          <strong>{p.funcionario.nome}</strong>
                          {podeAlterar ? (
                            <form
                              action={atualizarParticipanteAction}
                              style={{
                                display: "flex",
                                gap: 12,
                                alignItems: "center",
                                flexWrap: "wrap",
                                marginTop: 6,
                              }}
                            >
                              <input
                                type="hidden"
                                name="participanteId"
                                value={p.id}
                              />
                              <label>
                                <input
                                  type="checkbox"
                                  name="presente"
                                  defaultChecked={p.presente}
                                />{" "}
                                Presente
                              </label>
                              <label>
                                <input
                                  type="checkbox"
                                  name="aprovado"
                                  defaultChecked={p.aprovado}
                                />{" "}
                                Aprovado
                              </label>
                              <button className="button button-secondary">
                                Salvar
                              </button>
                            </form>
                          ) : null}
                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: 8,
                              marginTop: 8,
                            }}
                          >
                            {p.certificado?.status === "ATIVO" ? (
                              <>
                                <Link
                                  className="button button-secondary"
                                  href={`/api/sst/certificados/${p.id}/pdf`}
                                  target="_blank"
                                >
                                  Abrir certificado
                                </Link>
                                {podeAlterar && emailConfigurado ? (
                                  <form
                                    action={enviarCertificadoEmailAction}
                                    style={{ display: "flex", gap: 8 }}
                                  >
                                    <input
                                      type="hidden"
                                      name="participanteId"
                                      value={p.id}
                                    />
                                    <input
                                      name="para"
                                      type="email"
                                      required
                                      defaultValue={p.funcionario.email ?? ""}
                                      placeholder="E-mail"
                                    />
                                    <button className="button button-secondary">
                                      Enviar
                                    </button>
                                  </form>
                                ) : null}
                                {podeAlterar ? (
                                  <form
                                    action={invalidarCertificadoAction}
                                    style={{ display: "flex", gap: 8 }}
                                  >
                                    <input
                                      type="hidden"
                                      name="participanteId"
                                      value={p.id}
                                    />
                                    <input
                                      name="motivo"
                                      minLength={10}
                                      required
                                      placeholder="Motivo da invalidação"
                                    />
                                    <button className="button button-ghost">
                                      Invalidar
                                    </button>
                                  </form>
                                ) : null}
                              </>
                            ) : podeAlterar && p.presente && p.aprovado ? (
                              <form action={emitirCertificadoAction}>
                                <input
                                  type="hidden"
                                  name="participanteId"
                                  value={p.id}
                                />
                                <button className="button">
                                  {p.certificado
                                    ? "Reemitir certificado"
                                    : "Emitir certificado"}
                                </button>
                              </form>
                            ) : null}
                          </div>
                          <HistoricoCertificado emissoes={p.emissoes} />
                        </div>
                      ))}
                    </div>
                  </details>
                ))
              )}
            </div>
          </section>

          {podeAlterar ? (
            <section className="panel" style={{ marginTop: 16 }}>
              <h2>Nova ordem de serviço</h2>
              <form action={criarOrdemServicoAction} className="form-stack">
                <input type="hidden" name="clienteId" value={clienteId} />
                <select name="funcionarioId" required>
                  <option value="">Funcionário</option>
                  {funcionarios.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.nome}
                    </option>
                  ))}
                </select>
                <input name="numero" placeholder="OS-2026-0001" required />
                <input name="emitidaEm" type="date" required />
                <textarea name="atividades" placeholder="Atividades" required />
                <textarea
                  name="riscos"
                  placeholder="Riscos ocupacionais"
                  required
                />
                <textarea
                  name="medidas"
                  placeholder="Medidas preventivas"
                  required
                />
                <textarea name="epis" placeholder="EPIs" />
                <button className="button">Criar ordem de serviço</button>
              </form>
            </section>
          ) : null}
          <div className="ios-list" style={{ marginTop: 16 }}>
            {ordens.map((o) => (
              <div key={o.id} className="ios-row">
                <span className="ios-row-label">
                  <strong>{o.numero}</strong>
                  <small>
                    {o.funcionario.nome} • {o.status} •{" "}
                    {o.emitidaEm.toLocaleDateString("pt-BR", {
                      timeZone: "UTC",
                    })}
                  </small>
                </span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  <Link
                    className="button button-secondary"
                    href={`/api/sst/ordens/${o.id}/pdf`}
                    target="_blank"
                  >
                    Abrir PDF
                  </Link>
                  {podeAlterar ? (
                    <form
                      action={atualizarStatusOrdemServicoAction}
                      style={{ display: "contents" }}
                    >
                      <input type="hidden" name="ordemId" value={o.id} />
                      {o.status === "RASCUNHO" ? (
                        <button
                          className="button button-secondary"
                          name="status"
                          value="EMITIDA"
                        >
                          Emitir
                        </button>
                      ) : null}
                      {o.status === "EMITIDA" ? (
                        <button
                          className="button button-secondary"
                          name="status"
                          value="ASSINADA"
                        >
                          Marcar assinada
                        </button>
                      ) : null}
                      {o.status !== "CANCELADA" ? (
                        <button
                          className="button button-ghost"
                          name="status"
                          value="CANCELADA"
                        >
                          Cancelar
                        </button>
                      ) : null}
                    </form>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </AppShell>
  );
}
