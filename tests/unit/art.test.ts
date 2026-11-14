import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  operador: vi.fn(), demandas: vi.fn(), documento: vi.fn(), criar: vi.fn(), auditar: vi.fn(), emitir: vi.fn(), revalidar: vi.fn(),
}));
vi.mock("@/lib/tenant", () => ({ exigirOperador: mocks.operador }));
vi.mock("@/lib/auditoria", () => ({ auditar: mocks.auditar, emitirEvento: mocks.emitir }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidar }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: (fn: (tx: unknown) => unknown) => fn({
      demanda: { findMany: mocks.demandas }, documento: { findFirst: mocks.documento }, artMultipla: { create: mocks.criar },
    }),
  },
}));

import { vincularArtAction } from "@/app/acoes/art";

const documentoId = "c123456789012345678901234";

function formulario() {
  const form = new FormData();
  form.set("numero", "1234567890-sp");
  form.set("documentoId", documentoId);
  form.set("confirmado", "on");
  form.append("codigo", "ENG-0001");
  form.append("codigo", "ENG-0002");
  return form;
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.operador.mockResolvedValue({ empresa: { id: "empresa-a" }, papel: "OPERADOR", email: "operador@example.test" });
  mocks.demandas.mockResolvedValue(["1", "2"].map((id) => ({
    id, numeroOs: id, uf: "SP", tipoServico: "AVALIACAO_IMOVEL", cliente: { empresaId: "empresa-a", documento: "00360305000100" },
  })));
  mocks.documento.mockResolvedValue({ id: documentoId });
  mocks.criar.mockResolvedValue({ id: "art-a" });
});

describe("vínculo de ART Múltipla", () => {
  it("grava as duas OS, normaliza o número e audita o vínculo", async () => {
    expect(await vincularArtAction({}, formulario())).toHaveProperty("ok");
    expect(mocks.documento).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: documentoId, empresaId: "empresa-a", demandaId: { in: ["1", "2"] }, tipo: "ART", mime: "application/pdf", removidoEm: null },
    }));
    expect(mocks.criar).toHaveBeenCalledWith({ data: {
      empresaId: "empresa-a", numero: "1234567890", documentoId, criadoPor: "operador@example.test",
      itens: { create: [{ demandaId: "1" }, { demandaId: "2" }] },
    } });
    expect(mocks.auditar).toHaveBeenCalledWith(expect.objectContaining({ objetoId: "art-a" }), expect.anything());
    const [, transacao] = mocks.auditar.mock.calls[0];
    expect(mocks.emitir).toHaveBeenCalledExactlyOnceWith("empresa-a", "ArtMultiplaVinculada", { artId: "art-a", demandaIds: ["1", "2"] }, transacao);
  });

  it("recusa o lote inteiro quando uma OS está indisponível na empresa", async () => {
    mocks.demandas.mockResolvedValue([]);
    expect(await vincularArtAction({}, formulario())).toHaveProperty("erro");
    expect(mocks.demandas).toHaveBeenCalledWith(expect.objectContaining({
      where: { empresaId: "empresa-a", codigo: { in: ["ENG-0001", "ENG-0002"] } },
    }));
    expect(mocks.documento).not.toHaveBeenCalled();
    expect(mocks.criar).not.toHaveBeenCalled();
    expect(mocks.emitir).not.toHaveBeenCalled();
  });

  it("recusa PDF que não pertence aos dossiês da seleção", async () => {
    mocks.documento.mockResolvedValue(null);
    expect(await vincularArtAction({}, formulario())).toHaveProperty("erro");
    expect(mocks.criar).not.toHaveBeenCalled();
    expect(mocks.emitir).not.toHaveBeenCalled();
  });
});
