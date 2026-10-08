import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

/**
 * Sessão emitida pelo login único da casa (`auth.avilaops.com`).
 *
 * O cookie `avila_sso` é gravado em `.avilaops.com` e chega aqui sozinho. A
 * assinatura é conferida localmente com o segredo compartilhado, sem ida ao
 * auth por request. O SSO diz QUEM é a pessoa; o que ela pode fazer em cada
 * empresa é decisão deste app (`src/lib/tenant.ts`).
 */

const COOKIE_SSO = "avila_sso";
const EMISSOR = "auth.avilaops.com";

export type SessaoSSO = {
  sub: string;
  email: string;
  nome: string;
  foto: string | null;
  papel: "ADMIN" | "CLIENTE";
};

export function ssoBaseUrl(): string {
  return process.env.SSO_BASE_URL || "https://auth.avilaops.com";
}

export function siteUrl(): string {
  return process.env.ENGOPS_SITE_URL || "https://engops.avilaops.com";
}

/** URL de login deste app no SSO, voltando para a tela pedida. */
export function urlLoginSSO(returnTo = `${siteUrl()}/demandas`): string {
  const p = new URLSearchParams({ app: "engops", returnTo });
  return `${ssoBaseUrl()}/login?${p.toString()}`;
}

export function urlLogoutSSO(): string {
  return `${ssoBaseUrl()}/logout`;
}

export async function lerSessaoSSO(): Promise<SessaoSSO | null> {
  const segredo = process.env.SSO_JWT_SECRET;
  const token = segredo ? (await cookies()).get(COOKIE_SSO)?.value : undefined;

  if (segredo && token) {
    try {
      return jwt.verify(token, segredo, { issuer: EMISSOR }) as SessaoSSO;
    } catch {
      // Cookie vencido ou de outro emissor: cai no caminho de "sem sessão".
    }
  }

  // Desenvolvimento sem o auth no ar. Nunca em produção.
  const dev = process.env.ENGOPS_DEV_EMAIL;
  if (dev && process.env.NODE_ENV !== "production") {
    return { sub: "dev", email: dev.toLowerCase(), nome: "Desenvolvimento", foto: null, papel: "ADMIN" };
  }

  return null;
}
