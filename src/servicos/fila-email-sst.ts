export function chaveEnvioCertificado(certificadoId: string, versao: number, para: string) {
  return `certificado:${certificadoId}:v${versao}:${para.trim().toLowerCase()}`;
}

export function proximaTentativaEmail(tentativas: number, agora = new Date()): Date | null {
  if (tentativas >= 5) return null;
  return new Date(agora.getTime() + 60_000 * 2 ** Math.max(0, tentativas - 1));
}
import { prisma } from "@/lib/prisma";
import { lerArquivoBytes } from "@/lib/storage";
import { enviarEmailSst } from "@/servicos/email";


export async function processarFilaEmailSst(agora = new Date(), limite = 10): Promise<number> {
  const pendentes = await prisma.envioEmailSst.findMany({
    where: { status: { in: ["PENDENTE", "FALHOU"] }, tentativas: { lt: 5 }, proximaTentativa: { lte: agora } },
    orderBy: { criadoEm: "asc" }, take: limite,
    include: { certificado: { include: { participante: { include: { funcionario: true, treinamento: true } } } } },
  });
  let enviados = 0;
  for (const item of pendentes) {
    const reservado = await prisma.envioEmailSst.updateMany({ where: { id: item.id, status: { in: ["PENDENTE", "FALHOU"] } }, data: { status: "PROCESSANDO", tentativas: { increment: 1 }, erro: null } });
    if (!reservado.count) continue;
    const tentativa = item.tentativas + 1;
    try {
      if (item.certificado.status !== "ATIVO" || !item.certificado.arquivoChave) throw new Error("Certificado não está ativo ou não possui PDF armazenado.");
      const bytes = await lerArquivoBytes(item.certificado.arquivoChave);
      if (!bytes) throw new Error("PDF do certificado não encontrado.");
      const treinamento = item.certificado.participante.treinamento;
      await enviarEmailSst({ para: item.para, assunto: `Certificado • ${treinamento.titulo}`, texto: `Olá, ${item.certificado.participante.funcionario.nome}.\n\nSegue em anexo seu certificado de ${treinamento.titulo}.`, anexos: [{ nome: `${item.certificado.numero}.pdf`, mime: "application/pdf", base64: bytes.toString("base64") }] });
      await prisma.envioEmailSst.update({ where: { id: item.id }, data: { status: "ENVIADO", enviadoEm: new Date(), erro: null } });
      enviados += 1;
    } catch (erro) {
      const proxima = proximaTentativaEmail(tentativa, agora);
      await prisma.envioEmailSst.update({ where: { id: item.id }, data: { status: "FALHOU", proximaTentativa: proxima ?? new Date("9999-12-31T00:00:00Z"), erro: erro instanceof Error ? erro.message.slice(0, 1000) : "Falha desconhecida" } });
    }
  }
  return enviados;
}
