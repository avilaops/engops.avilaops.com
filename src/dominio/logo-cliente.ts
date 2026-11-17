const TIPOS = new Map([["image/png", "png"], ["image/jpeg", "jpg"], ["image/webp", "webp"]]);

export function validarLogoCliente(arquivo: { name: string; type: string; size: number }) {
  const extensao = TIPOS.get(arquivo.type);
  if (!extensao || arquivo.size <= 0 || arquivo.size > 3 * 1024 * 1024) throw new Error("Envie uma logo PNG, JPEG ou WebP de até 3 MB.");
  return { extensao, mime: arquivo.type };
}

export function validarAssinaturaLogo(bytes: Uint8Array, mime: string): boolean {
  if (mime === "image/png") return bytes.length >= 4 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  if (mime === "image/jpeg") return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mime === "image/webp") return bytes.length >= 12 && Buffer.from(bytes.slice(0, 4)).toString("ascii") === "RIFF" && Buffer.from(bytes.slice(8, 12)).toString("ascii") === "WEBP";
  return false;
}
