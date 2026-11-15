import { Prisma } from "@prisma/client";
import { esquemaOportunidade, type OportunidadeGov } from "@/integracoes/gov";
import { chaveGov, dataGov, fingerprintGov, normalizarBuscaGov, regiaoGov } from "@/dominio/gov-catalogo";
import { avisarNovasGov, reconciliarSalvosGov } from "@/servicos/gov-alertas";

/** A entrada vem exclusivamente dos adaptadores oficiais, nunca de um form. */
export async function indexarGov(tx: Prisma.TransactionClient, entrada: OportunidadeGov) {
  const dados = esquemaOportunidade.parse(entrada);
  const id = chaveGov(dados);
  // Serializa fontes concorrentes para a mesma identificação pública.
  await tx.$queryRaw(Prisma.sql`SELECT true AS reservado FROM pg_advisory_xact_lock(hashtextextended(${id}, 0))`);
  const anterior = await tx.govRegistro.findUnique({ where: { id } });
  const atualizadoFonte = dataGov(dados.atualizado);
  const timestampAnterior = anterior?.atualizadoFonte?.getTime() ?? 0;
  const timestampNovo = atualizadoFonte?.getTime() ?? 0;
  const antigasFontes = anterior?.fontes ?? [];
  const fontes = [...new Set([...antigasFontes, dados.fonte])];
  const anteriorDados = anterior?.dados as OportunidadeGov | undefined;
  const antigo = anterior && (timestampNovo < timestampAnterior || (timestampNovo === timestampAnterior && anteriorDados?.fonte === "PNCP" && dados.fonte === "COMPRAS"));
  if (antigo) {
    const registro = await tx.govRegistro.update({ where: { id }, data: { fontes, conferidoEm: new Date() } });
    await reconciliarSalvosGov(tx, registro, false);
    return registro;
  }
  const fingerprint = fingerprintGov(dados);
  const mudou = anterior !== null && anterior.fingerprint !== fingerprint;
  const campos = {
    externoId: dados.id, tipo: dados.tipo, fontes, objeto: dados.objeto, orgao: dados.orgao,
    cnpj: dados.cnpj, uf: dados.uf, regiao: regiaoGov(dados.uf), categoria: dados.categoria ?? null,
    modalidade: dados.modalidade, poder: dados.poder ?? null, esfera: dados.esfera ?? null,
    valor: dados.valor === null ? null : new Prisma.Decimal(String(dados.valor)),
    publicado: dataGov(dados.publicado), prazo: dataGov(dados.prazo), atualizadoFonte,
    dados: dados as Prisma.InputJsonValue, busca: normalizarBuscaGov(`${dados.objeto} ${dados.orgao}`), fingerprint,
    conferidoEm: new Date(), erroConferencia: null, proximaVerificacaoEm: new Date(Date.now() + 6 * 3600000),
  };
  const registro = await tx.govRegistro.upsert({ where: { id },
    create: { id, ...campos }, update: { ...campos, ...(mudou ? { revisao: { increment: 1 } } : {}) },
  });
  await reconciliarSalvosGov(tx, registro, mudou);
  if (!anterior) await avisarNovasGov(tx, registro);
  return registro;
}
