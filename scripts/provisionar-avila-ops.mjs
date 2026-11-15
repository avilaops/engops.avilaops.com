import { PrismaClient } from "@prisma/client";

// Executar com DATABASE_URL do ambiente destino. Nunca cria senha ou convite.
const db = new PrismaClient();
const email = "nicolas@avilaops.com";
try {
  const resultado = await db.$transaction(async tx => {
    const candidatas = await tx.empresa.findMany({ where: { OR: [{ slug: "avila-ops" }, { cnpj: "67.954.417/0001-64" }, { cnpj: "67954417000164" }] } });
    if (candidatas.length > 1) throw new Error("Cadastro ambíguo da Ávila Ops; conferir antes de alterar.");
    const existente = candidatas[0];
    if (existente?.cnpj && existente.cnpj.replace(/\D/g, "") !== "67954417000164") throw new Error("Slug ocupado por outro CNPJ.");
    const empresa = existente
      ? await tx.empresa.update({ where: { id: existente.id }, data: { nome: "Ávila Ops", cnpj: "67.954.417/0001-64", ativo: true } })
      : await tx.empresa.create({ data: { slug: "avila-ops", nome: "Ávila Ops", cnpj: "67.954.417/0001-64" } });
    await tx.membro.upsert({ where: { empresaId_email: { empresaId: empresa.id, email } }, create: { empresaId: empresa.id, email, nome: "Nicolas", papel: "ADMIN" }, update: { papel: "ADMIN", ativo: true } });
    if (!existente) await tx.auditoria.create({ data: { empresaId: empresa.id, usuario: email, acao: "empresa.criada", objetoTipo: "Empresa", objetoId: empresa.id, origem: "provisionamento", depois: { nome: empresa.nome, cnpj: empresa.cnpj, slug: empresa.slug } } });
    return { id: empresa.id, nome: empresa.nome, cnpj: empresa.cnpj, criada: !existente };
  });
  console.log(JSON.stringify(resultado));
} finally { await db.$disconnect(); }
