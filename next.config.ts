import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname),
  serverExternalPackages: ["@prisma/client"],
  poweredByHeader: false,
  // Upload de dossiê: PDF de matrícula e laudo passam fácil de 10 MB.
  experimental: { serverActions: { bodySizeLimit: "40mb" } },
};

export default nextConfig;
