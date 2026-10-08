import { NextResponse } from "next/server";
import { NOME_COOKIE_EMPRESA } from "@/lib/tenant";
import { urlLogoutSSO } from "@/lib/sessao";

/** Sai daqui e do login único: apaga o cookie do SSO no domínio pai e manda ao auth. */
export async function POST() {
  const r = NextResponse.redirect(urlLogoutSSO(), 303);
  r.cookies.set("avila_sso", "", { maxAge: 0, path: "/", domain: process.env.SSO_COOKIE_DOMAIN || ".avilaops.com" });
  r.cookies.set(NOME_COOKIE_EMPRESA, "", { maxAge: 0, path: "/" });
  return r;
}
