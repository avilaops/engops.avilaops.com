import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", async () => ({ prisma: process.env.SST_TEST_DATABASE_URL ? new (await import("@prisma/client")).PrismaClient({ datasourceUrl: process.env.SST_TEST_DATABASE_URL }) : {} }));
import { prisma } from "@/lib/prisma";
import { eventosDaAgenda } from "@/servicos/agenda";
import { exigirModulo } from "@/servicos/modulos";
import { intervaloDoMes } from "@/dominio/agenda";

const url = process.env.SST_TEST_DATABASE_URL;
let empresaA: string; let empresaB: string;

describe.skipIf(!url)("RH e SST • PostgreSQL isolado", () => {
  beforeAll(async () => {
    if (!/^engops_sst_test_[a-z0-9_]+$/.test(new URL(url!).pathname.slice(1))) throw new Error("Exige banco SST isolado.");
    const [a, b] = await Promise.all(["a", "b"].map(sufixo => prisma.empresa.create({ data: { slug: `sst-${sufixo}`, nome: `Tenant ${sufixo.toUpperCase()}` } })));
    empresaA = a.id; empresaB = b.id;
    await prisma.moduloEmpresa.createMany({ data: [{ empresaId: empresaA, modulo: "RH", ativadoPor: "teste" }, { empresaId: empresaA, modulo: "SST", ativadoPor: "teste" }, { empresaId: empresaB, modulo: "RH", ativadoPor: "teste" }] });
    await prisma.compromissoAgenda.createMany({ data: [{ empresaId: empresaA, titulo: "Evento A", inicio: new Date("2026-11-10T12:00:00Z"), criadoPor: "teste" }, { empresaId: empresaB, titulo: "Evento B", inicio: new Date("2026-11-11T12:00:00Z"), criadoPor: "teste" }] });
  });
  afterAll(async () => { if (url) await (prisma as PrismaClient).$disconnect(); });

  it("recusa módulo desabilitado para o tenant", async () => {
    await expect(exigirModulo(empresaB, "SST")).rejects.toThrow(/não habilitado/);
    await expect(exigirModulo(empresaA, "SST")).resolves.toBeUndefined();
  });

  it("agenda nunca retorna evento de outro tenant", async () => {
    const eventos = await eventosDaAgenda(empresaA, intervaloDoMes(2026, 11), ["RH", "SST"]);
    expect(eventos.map(evento => evento.titulo)).toEqual(["Evento A"]);
  });
});
