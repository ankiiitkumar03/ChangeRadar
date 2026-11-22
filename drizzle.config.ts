import { config as loadEnv } from "dotenv";
import { defineConfig } from "drizzle-kit";

const environment = process.env.NODE_ENV;
const envFiles = [
  environment ? `.env.${environment}.local` : null,
  ".env.local",
  environment ? `.env.${environment}` : null,
  ".env",
].filter((file): file is string => Boolean(file));

for (const file of envFiles) loadEnv({ path: file });

export default defineConfig({
  dialect: "postgresql",
  out: "./drizzle",
  schema: "./src/lib/schema.ts",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});