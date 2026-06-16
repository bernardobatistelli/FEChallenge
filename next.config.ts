import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite ships a wasm binary and uses Node built-ins; keep it external to the
  // server bundle so Next doesn't try to bundle the wasm module.
  serverExternalPackages: ["@electric-sql/pglite"],
};

export default nextConfig;
