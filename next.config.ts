import { readFileSync } from "node:fs";
import { parse } from "dotenv";
import type { NextConfig } from "next";

// In local development, fill blank shell variables from the usual env files.
// Windows terminals can export empty values that otherwise shadow .env.local.
if (process.env.NODE_ENV !== "production") {
  const environment = process.env.NODE_ENV;
  const envFiles = [
    environment ? `.env.${environment}.local` : null,
    ".env.local",
    environment ? `.env.${environment}` : null,
    ".env",
  ].filter((file): file is string => Boolean(file));

  for (const file of envFiles) {
    try {
      const values = parse(readFileSync(file));
      for (const [key, value] of Object.entries(values)) {
        if (!process.env[key]?.trim() && value.trim()) process.env[key] = value;
      }
    } catch {
      // Local env files are optional when values are provided by the shell.
    }
  }
}

const nextConfig: NextConfig = {
  reactCompiler: true,
  cacheComponents: false,
  images: {
    unoptimized: process.env.NODE_ENV === "development",
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      {
        protocol: "http",
        hostname: "**",
      },
    ],
  },
  allowedDevOrigins: ["*"],
} as NextConfig;

export default nextConfig;
