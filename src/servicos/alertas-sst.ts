import { prisma } from "@/lib/prisma";
import { chaveDataOperacional } from "@/dominio/agenda";

export function deveAlertarVencimento(dias: number) { return dias === 30 || dias === 7 || dias === 1 || dias === 0; }
export function deveAlertarTreinamento(dias: number) { return dias === 7 || dias === 1 || dias === 0; }
export function diasAteVencimento(agora: Date, vencimento: Date) {
  const inicio = Date.parse(`${chaveDataOperacional(agora)}T00:00:00Z`); const fim = Date.parse(`${chaveDataOperacional(vencimento)}T00:00:00Z`);
  return Math.round((fim - inicio) / 86_400_000);
}
export function chaveAlertaSst(certificadoId: string, versao: number, vencimento: Date, destinatario: string, dias: number) { return `sst:certificado:${certificadoId}:v${versao}:${chaveDataOperacional(vencimento)}:${dias}:${destinatario.toLowerCase()}`; }
export function chaveAlertaTreinamento(treinamentoId: string, inicio: Date, destinatario: string, dias: number) { return `sst:treinamento:${treinamentoId}:${chaveDataOperacional(inicio)}:${dias}:${destinatario.toLowerCase()}`; }

export async function gerarAlertasVencimentosSst(agora = new Date()) {
  const limite = new Date(agora.getTime() + 31 * 86_400_000);
  const certificados = await prisma.certificadoSst.findMany({ where: { status: "ATIVO", venceEm: { gte: new Date(agora.getTime() - 86_400_000), lte: limite } }, include: { cliente: true, participante: { include: { funcionario: true } } } });
  let criados = 0;
  for (const certificado of certificados) {
    if (!certificado.venceEm) continue; const dias = diasAteVencimento(agora, certificado.venceEm); if (!deveAlertarVencimento(dias)) continue;
    const membros = await prisma.membro.findMany({ where: { empresaId: certificado.empresaId, ativo: true, papel: { in: ["ADMIN", "GESTOR", "OPERADOR"] } }, select: { email: true } });
    const resultado = await prisma.notificacao.createMany({ data: membros.map(membro => ({ chave: chaveAlertaSst(certificado.id, certificado.versao, certificado.venceEm!, membro.email, dias), empresaId: certificado.empresaId, destinatario: membro.email.toLowerCase(), titulo: dias === 0 ? "Certificado vence hoje" : `Certificado vence em ${dias} dia(s)`, corpo: `${certificado.participante.funcionario.nome} • ${certificado.cliente.nome}`, link: `/sst?cliente=${certificado.clienteId}` })), skipDuplicates: true });
    criados += resultado.count;
  }
  const treinamentos = await prisma.treinamentoSst.findMany({ where: { status: "PLANEJADO", inicio: { gte: new Date(agora.getTime() - 86_400_000), lte: new Date(agora.getTime() + 8 * 86_400_000) } }, include: { cliente: true } });
  for (const treinamento of treinamentos) {
    const dias = diasAteVencimento(agora, treinamento.inicio); if (!deveAlertarTreinamento(dias)) continue;
    const membros = await prisma.membro.findMany({ where: { empresaId: treinamento.empresaId, ativo: true, papel: { in: ["ADMIN", "GESTOR", "OPERADOR"] } }, select: { email: true } });
    const resultado = await prisma.notificacao.createMany({ data: membros.map(membro => ({ chave: chaveAlertaTreinamento(treinamento.id, treinamento.inicio, membro.email, dias), empresaId: treinamento.empresaId, destinatario: membro.email.toLowerCase(), titulo: dias === 0 ? "Treinamento ocorre hoje" : `Treinamento em ${dias} dia(s)`, corpo: `${treinamento.titulo} • ${treinamento.cliente.nome}`, link: `/sst?cliente=${treinamento.clienteId}` })), skipDuplicates: true });
    criados += resultado.count;
  }
  return criados;
}
