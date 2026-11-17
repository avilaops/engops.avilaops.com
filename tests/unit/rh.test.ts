import { describe, expect, it } from "vitest";
import { alteracaoEstruturaRhSchema, alteracaoFuncionarioSchema, funcionarioSchema } from "@/dominio/rh";

describe("RH", () => {
  it("normaliza CPF e exige nome, setor e cargo", () => {
    const valor = funcionarioSchema.parse({ clienteId: "cliente-1", nome: "  Ana Silva ", cpf: "123.456.789-09", setorId: "setor-1", cargoId: "cargo-1" });
    expect(valor).toMatchObject({ clienteId: "cliente-1", nome: "Ana Silva", cpf: "12345678909" });
  });

  it("rejeita CPF com tamanho inválido", () => {
    expect(() => funcionarioSchema.parse({ clienteId: "cliente-1", nome: "Ana", cpf: "123", setorId: "s", cargoId: "c" })).toThrow();
  });

  it("exige a empresa cliente no cadastro do RH", () => {
    expect(() => funcionarioSchema.parse({ nome: "Ana", cpf: "12345678909", setorId: "s", cargoId: "c" })).toThrow();
  });

  it("valida edição e situação do funcionário", () => {
    expect(alteracaoFuncionarioSchema.parse({ id: "f1", clienteId: "c1", nome: " Ana ", email: "", telefone: " 17 9999-0000 ", matricula: "A-1", status: "AFASTADO" })).toMatchObject({ nome: "Ana", email: null, status: "AFASTADO" });
    expect(() => alteracaoFuncionarioSchema.parse({ id: "f1", clienteId: "c1", nome: "Ana", status: "EXCLUIDO" })).toThrow();
  });

  it("valida edição e ativação de setor ou cargo", () => {
    expect(alteracaoEstruturaRhSchema.parse({ id: "s1", clienteId: "c1", nome: " Produção ", descricao: "", ativo: "false" })).toEqual({ id: "s1", clienteId: "c1", nome: "Produção", descricao: null, ativo: false });
  });
});
