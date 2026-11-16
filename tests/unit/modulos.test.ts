import { describe, expect, it } from "vitest";
import { MODULOS, moduloHabilitado, podeAdministrarModulos, podeAlterarPessoas } from "@/dominio/modulos";
import { navegacaoDoPapel } from "@/lib/navegacao";

describe("módulos por tenant", () => {
  it("mantém catálogo fechado para RH e SST", () => {
    expect(MODULOS.map((modulo) => modulo.chave)).toEqual(["RH", "SST"]);
  });

  it("só considera habilitação ativa da chave pedida", () => {
    expect(moduloHabilitado([{ modulo: "RH", ativo: true }], "RH")).toBe(true);
    expect(moduloHabilitado([{ modulo: "RH", ativo: false }], "RH")).toBe(false);
    expect(moduloHabilitado([{ modulo: "RH", ativo: true }], "SST")).toBe(false);
  });

  it("somente dono da plataforma administra ativações", () => {
    expect(podeAdministrarModulos(true)).toBe(true);
    expect(podeAdministrarModulos(false)).toBe(false);
  });

  it("impede perfil de consulta de alterar RH, SST e agenda", () => {
    expect(podeAlterarPessoas("CONSULTA")).toBe(false);
    expect(podeAlterarPessoas("ADMIN")).toBe(true);
    expect(podeAlterarPessoas("OPERADOR")).toBe(true);
  });

  it("navegação mostra apenas módulos habilitados", () => {
    const semModulos = navegacaoDoPapel("ADMIN", []);
    const comRh = navegacaoDoPapel("ADMIN", ["RH"]);
    const hrefsSem = semModulos.flatMap((grupo) => grupo.items.map((item) => item.href));
    const hrefsRh = comRh.flatMap((grupo) => grupo.items.map((item) => item.href));
    expect(hrefsSem).not.toContain("/rh");
    expect(hrefsSem).not.toContain("/sst");
    expect(hrefsRh).toContain("/rh");
    expect(hrefsRh).not.toContain("/sst");
  });
});
