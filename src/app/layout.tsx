import type { Metadata, Viewport } from "next";
import { scriptInicial } from "@/lib/tema-noturno";
import "./globals.css";

const siteUrl = process.env.ENGOPS_SITE_URL || "https://engops.avilaops.com";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f7f9" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0d10" },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "EngOps", template: "%s · EngOps" },
  description: "Sistema operacional das demandas Caixa: OS, documentos, validação, SIMIL, RAE e SIOPI.",
  robots: { index: false, follow: false },
  manifest: "/site.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "EngOps" },
  icons: {
    icon: [
      { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
      { url: "/favicon.ico" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // O script do <head> troca data-theme antes do React montar: o aviso de hidratação aqui é esperado.
    <html lang="pt-BR" data-theme="light" style={{ colorScheme: "light" }} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: scriptInicial() }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
