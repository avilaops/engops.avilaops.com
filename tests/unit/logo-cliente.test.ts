import { describe, expect, it } from "vitest";
import { validarAssinaturaLogo, validarLogoCliente } from "@/dominio/logo-cliente";

describe("logo da empresa cliente", () => {
  it("aceita PNG, JPEG e WebP até 3 MB", () => {
    expect(validarLogoCliente({ name: "logo.png", type: "image/png", size: 1200 })).toEqual({ extensao: "png", mime: "image/png" });
    expect(validarLogoCliente({ name: "logo.webp", type: "image/webp", size: 3 * 1024 * 1024 })).toEqual({ extensao: "webp", mime: "image/webp" });
  });

  it("rejeita arquivo executável ou grande", () => {
    expect(() => validarLogoCliente({ name: "logo.svg", type: "image/svg+xml", size: 100 })).toThrow();
    expect(() => validarLogoCliente({ name: "logo.png", type: "image/png", size: 3 * 1024 * 1024 + 1 })).toThrow();
  });

  it("confere a assinatura binária de PNG, JPEG e WebP", () => {
    expect(validarAssinaturaLogo(Buffer.from([0x89, 0x50, 0x4e, 0x47]), "image/png")).toBe(true);
    expect(validarAssinaturaLogo(Buffer.from([0xff, 0xd8, 0xff, 0xe0]), "image/jpeg")).toBe(true);
    expect(validarAssinaturaLogo(Buffer.from("RIFF1234WEBP"), "image/webp")).toBe(true);
    expect(validarAssinaturaLogo(Buffer.from("MZ executable"), "image/png")).toBe(false);
  });
});
