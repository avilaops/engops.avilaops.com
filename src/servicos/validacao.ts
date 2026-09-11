import { prisma } from "@/lib/prisma";
import { calcularChecklist, proximaAcao, type ItemCalculado } from "@/dominio/checklist";
import { validarTudo, type Problema, type RetratoDemanda } from "@/dominio/validacao";

/**
 * Recalcula pendências e checklist de uma demanda a partir do estado real e
 * grava. Chamado depois de toda mudança relevante (cadastro, documento,
 * execução). Pendência MANUAL é a única que não é recalculada: alguém a
 * abriu à mão e só alguém a fecha.
 */
export async function revalidarDemanda(demandaId: string): Promise<{
  problemas: Problema[];
  checklist: ItemCalculado[];
  proxima: ReturnType<typeof proximaAcao>;
}> {
  const d = await prisma.demanda.findUnique({
    where: { id: demandaId },
    include: {
      documentos: { where: { removidoEm: null }, select: { id: true, tipo: true, nomeArquivo: true, dados: true } },
      execucoes: { select: { sistema: true, status: true } },
    },
  });
  if (!d) throw new Error("Demanda não encontrada");

  const retrato: RetratoDemanda = {
    numeroOs: d.numeroOs,
    endereco: d.endereco,
    numero: d.numero,
    municipio: d.municipio,
    uf: d.uf,
    cep: d.cep,
    matricula: d.matricula,
    areaM2: d.areaM2 === null ? null : Number(d.areaM2),
    tipoImovel: d.tipoImovel,
    proprietarioNome: d.proprietarioNome,
    proprietarioDoc: d.proprietarioDoc,
    prazo: d.prazo,
    documentos: d.documentos.map((x) => ({ id: x.id, tipo: x.tipo, nomeArquivo: x.nomeArquivo, dados: (x.dados as Record<string, unknown> | null) ?? null })),
  };

  const problemas = validarTudo(retrato);

  await prisma.$transaction(async (tx) => {
    const abertas = await tx.pendencia.findMany({ where: { demandaId, resolvidaEm: null, origem: { not: "MANUAL" } } });
    const chaveDe = (p: { codigo: string; campo?: string | null; titulo: string }) => `${p.codigo}|${p.campo ?? ""}|${p.titulo}`;
    const atuais = new Map(problemas.map((p) => [chaveDe(p), p]));
    const existentes = new Map(abertas.map((p) => [chaveDe(p), p]));

    for (const [chave, p] of existentes) {
      if (!atuais.has(chave)) await tx.pendencia.update({ where: { id: p.id }, data: { resolvidaEm: new Date(), resolvidaPor: "sistema" } });
    }
    for (const [chave, p] of atuais) {
      if (!existentes.has(chave)) {
        await tx.pendencia.create({
          data: { empresaId: d.empresaId, demandaId, codigo: p.codigo, severidade: p.severidade, titulo: p.titulo, detalhe: p.detalhe, campo: p.campo, origem: p.origem },
        });
      }
    }
  });

  const manuais = await prisma.pendencia.findMany({ where: { demandaId, resolvidaEm: null, origem: "MANUAL" } });
  const todos: Problema[] = [
    ...problemas,
    ...manuais.map((m) => ({ codigo: m.codigo, severidade: m.severidade, titulo: m.titulo, detalhe: m.detalhe ?? undefined, campo: m.campo ?? undefined, origem: "DETECTOR" as const })),
  ];

  const entrada = {
    status: d.status,
    documentosPorTipo: new Set(d.documentos.map((x) => x.tipo)),
    problemas: todos,
    execucoes: d.execucoes,
    temPacoteFinal: d.documentos.some((x) => x.tipo === "PACOTE_FINAL"),
  };
  const checklist = calcularChecklist(entrada);

  await prisma.$transaction(
    checklist.map((i) =>
      prisma.itemChecklist.upsert({
        where: { demandaId_chave: { demandaId, chave: i.chave } },
        create: { demandaId, grupo: i.grupo, chave: i.chave, rotulo: i.rotulo, estado: i.estado, ordem: i.ordem, detalhe: i.detalhe },
        update: { grupo: i.grupo, rotulo: i.rotulo, estado: i.estado, ordem: i.ordem, detalhe: i.detalhe ?? null },
      }),
    ),
  );

  return { problemas: todos, checklist, proxima: proximaAcao(entrada) };
}
