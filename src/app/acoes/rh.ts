"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exigirOperador } from "@/lib/tenant";
import {
  alteracaoEstruturaRhSchema,
  alteracaoFuncionarioSchema,
  cadastroNomeSchema,
  funcionarioSchema,
} from "@/dominio/rh";
import { podeAlterarPessoas } from "@/dominio/modulos";
import { exigirModulo } from "@/servicos/modulos";
import { validarVinculoRh } from "@/dominio/escopo-rh";
import { auditar } from "@/lib/auditoria";

async function contextoRh() {
  const op = await exigirOperador();
  await exigirModulo(op.empresa.id, "RH");
  if (!podeAlterarPessoas(op.papel))
    throw new Error("Sem permissão para alterar dados de RH.");
  return op;
}

export async function criarSetorAction(form: FormData): Promise<void> {
  const op = await contextoRh();
  const dados = cadastroNomeSchema.parse(Object.fromEntries(form));
  if (
    !(await prisma.cliente.findFirst({
      where: { id: dados.clienteId, empresaId: op.empresa.id },
    }))
  )
    throw new Error("Empresa cliente não pertence à GRB.");
  await prisma.$transaction(async (tx) => {
    const setor = await tx.setorRh.create({
      data: { empresaId: op.empresa.id, ...dados },
    });
    await auditar(
      {
        empresaId: op.empresa.id,
        usuario: op.email,
        acao: "rh.setor_criado",
        objetoTipo: "SetorRh",
        objetoId: setor.id,
        depois: setor,
        metadados: { clienteId: dados.clienteId },
      },
      tx,
    );
  });
  revalidatePath("/rh");
}

export async function criarCargoAction(form: FormData): Promise<void> {
  const op = await contextoRh();
  const dados = cadastroNomeSchema.parse(Object.fromEntries(form));
  if (
    !(await prisma.cliente.findFirst({
      where: { id: dados.clienteId, empresaId: op.empresa.id },
    }))
  )
    throw new Error("Empresa cliente não pertence à GRB.");
  await prisma.$transaction(async (tx) => {
    const cargo = await tx.cargoRh.create({
      data: {
        empresaId: op.empresa.id,
        ...dados,
        cbo: String(form.get("cbo") ?? "") || null,
      },
    });
    await auditar(
      {
        empresaId: op.empresa.id,
        usuario: op.email,
        acao: "rh.cargo_criado",
        objetoTipo: "CargoRh",
        objetoId: cargo.id,
        depois: cargo,
        metadados: { clienteId: dados.clienteId },
      },
      tx,
    );
  });
  revalidatePath("/rh");
}

export async function criarFuncionarioAction(form: FormData): Promise<void> {
  const op = await contextoRh();
  const dados = funcionarioSchema.parse(Object.fromEntries(form));
  const [setor, cargo] = await Promise.all([
    prisma.setorRh.findFirst({
      where: {
        id: dados.setorId,
        empresaId: op.empresa.id,
        clienteId: dados.clienteId,
      },
    }),
    prisma.cargoRh.findFirst({
      where: {
        id: dados.cargoId,
        empresaId: op.empresa.id,
        clienteId: dados.clienteId,
      },
    }),
  ]);
  validarVinculoRh(
    { empresaId: op.empresa.id, clienteId: dados.clienteId },
    setor,
    cargo,
  );
  await prisma.$transaction(async (tx) => {
    const funcionario = await tx.funcionarioRh.create({
      data: {
        ...dados,
        email: dados.email || null,
        matricula: dados.matricula || null,
        empresaId: op.empresa.id,
      },
    });
    await auditar(
      {
        empresaId: op.empresa.id,
        usuario: op.email,
        acao: "rh.funcionario_criado",
        objetoTipo: "FuncionarioRh",
        objetoId: funcionario.id,
        depois: funcionario,
        metadados: { clienteId: dados.clienteId },
      },
      tx,
    );
  });
  revalidatePath("/rh");
}

export async function atualizarSetorAction(form: FormData): Promise<void> {
  const op = await contextoRh();
  const dados = alteracaoEstruturaRhSchema.parse(Object.fromEntries(form));
  const atual = await prisma.setorRh.findFirst({
    where: {
      id: dados.id,
      empresaId: op.empresa.id,
      clienteId: dados.clienteId,
    },
  });
  if (!atual)
    throw new Error("Setor não encontrado na empresa cliente selecionada.");
  const { id, clienteId, ...alteracoes } = dados;
  await prisma.$transaction(async (tx) => {
    await tx.setorRh.update({ where: { id }, data: alteracoes });
    await auditar(
      {
        empresaId: op.empresa.id,
        usuario: op.email,
        acao: "rh.setor_atualizado",
        objetoTipo: "SetorRh",
        objetoId: id,
        antes: atual,
        depois: alteracoes,
        metadados: { clienteId },
      },
      tx,
    );
  });
  revalidatePath("/rh");
}

export async function atualizarCargoAction(form: FormData): Promise<void> {
  const op = await contextoRh();
  const dados = alteracaoEstruturaRhSchema.parse(Object.fromEntries(form));
  const atual = await prisma.cargoRh.findFirst({
    where: {
      id: dados.id,
      empresaId: op.empresa.id,
      clienteId: dados.clienteId,
    },
  });
  if (!atual)
    throw new Error("Cargo não encontrado na empresa cliente selecionada.");
  const { id, clienteId, ...base } = dados;
  const alteracoes = {
    ...base,
    cbo: String(form.get("cbo") ?? "").trim() || null,
  };
  await prisma.$transaction(async (tx) => {
    await tx.cargoRh.update({ where: { id }, data: alteracoes });
    await auditar(
      {
        empresaId: op.empresa.id,
        usuario: op.email,
        acao: "rh.cargo_atualizado",
        objetoTipo: "CargoRh",
        objetoId: id,
        antes: atual,
        depois: alteracoes,
        metadados: { clienteId },
      },
      tx,
    );
  });
  revalidatePath("/rh");
}

export async function atualizarFuncionarioAction(
  form: FormData,
): Promise<void> {
  const op = await contextoRh();
  const dados = alteracaoFuncionarioSchema.parse(Object.fromEntries(form));
  const atual = await prisma.funcionarioRh.findFirst({
    where: {
      id: dados.id,
      empresaId: op.empresa.id,
      clienteId: dados.clienteId,
    },
  });
  if (!atual)
    throw new Error(
      "Funcionário não encontrado na empresa cliente selecionada.",
    );
  const { id } = dados;
  const alteracoes = {
    nome: dados.nome,
    email: dados.email,
    telefone: dados.telefone,
    matricula: dados.matricula,
    status: dados.status,
  };
  await prisma.$transaction(async (tx) => {
    await tx.funcionarioRh.update({ where: { id }, data: alteracoes });
    await auditar(
      {
        empresaId: op.empresa.id,
        usuario: op.email,
        acao: "rh.funcionario_atualizado",
        objetoTipo: "FuncionarioRh",
        objetoId: id,
        antes: atual,
        depois: alteracoes,
        metadados: { clienteId: dados.clienteId },
      },
      tx,
    );
  });
  revalidatePath("/rh");
}
