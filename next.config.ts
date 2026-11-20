import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output is only needed for self-hosting; on Vercel it must stay off.
  output: process.env.VERCEL ? undefined : "standalone",
  // firebase-admin (and its google-gax dependency chain) must not be bundled
  // by the server compiler — load it as an external from node_modules.
  serverExternalPackages: ["firebase-admin"],
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Hide the floating dev-tools indicator for a clean preview.
  devIndicators: false,
};

export default nextConfig;
