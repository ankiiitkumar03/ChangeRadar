import { readFileSync } from "node:fs";
import { parse } from "dotenv";
import { defineConfig } from "drizzle-kit";

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
    // Environment files are optional when values are injected by the shell.
  }
}

export default defineConfig({
  dialect: "postgresql",
  out: "./drizzle",
  schema: "./src/lib/schema.ts",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
