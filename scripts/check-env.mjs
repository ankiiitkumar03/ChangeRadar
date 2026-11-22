import { readFileSync } from "node:fs";

// Load the same local env files as Next.js, without overriding shell/deployment values.
const environment = process.env.NODE_ENV;
const envFiles = [
  environment ? `.env.${environment}.local` : null,
  ".env.local",
  environment ? `.env.${environment}` : null,
  ".env",
].filter(Boolean);
for (const file of envFiles) {
  try {
    const contents = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
    for (const line of contents.split(/\r?\n/)) {
      const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!match || Object.hasOwn(process.env, match[1])) continue;
      let value = match[2].trim();
      if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
      process.env[match[1]] = value;
    }
  } catch { /* A local env file is optional when deployment values are injected. */ }
}

const errors = [];
const warnings = [];
const productionCheck = process.env.NODE_ENV === "production" || process.argv.includes("--production");
const required = ["DATABASE_URL", "BETTER_AUTH_SECRET", "BETTER_AUTH_URL", "NEXT_PUBLIC_APP_URL"];
if (productionCheck) required.push("CRON_SECRET");
for (const key of required) if (!process.env[key]?.trim()) errors.push(`${key} is required.`);

if (process.env.DATABASE_URL) {
  try {
    const url = new URL(process.env.DATABASE_URL);
    if (!["postgres:", "postgresql:"].includes(url.protocol)) errors.push("DATABASE_URL must use postgres:// or postgresql://.");
    if (!url.hostname) errors.push("DATABASE_URL must include a database host.");
  } catch { errors.push("DATABASE_URL is not a valid URL."); }
}
for (const key of ["BETTER_AUTH_URL", "NEXT_PUBLIC_APP_URL"]) {
  if (!process.env[key]) continue;
  try {
    const url = new URL(process.env[key]);
    if (process.env.NODE_ENV === "production" && url.protocol !== "https:") errors.push(`${key} must use HTTPS in production.`);
    if (url.pathname !== "/" || url.search || url.hash) warnings.push(`${key} should be an origin only, without a path, query, or hash.`);
  } catch { errors.push(`${key} must be a valid absolute URL.`); }
}
if (process.env.BETTER_AUTH_SECRET && process.env.BETTER_AUTH_SECRET.length < 32) errors.push("BETTER_AUTH_SECRET must contain at least 32 characters.");
if (process.env.CRON_SECRET && process.env.CRON_SECRET.length < 32) errors.push("CRON_SECRET must contain at least 32 characters.");

const razorpayKeys = ["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET", "RAZORPAY_WEBHOOK_SECRET", "RAZORPAY_PLAN_STARTER_MONTHLY", "RAZORPAY_PLAN_PRO_MONTHLY", "RAZORPAY_PLAN_BUSINESS_MONTHLY"];
const razorpayCount = razorpayKeys.filter((key) => process.env[key]?.trim()).length;
if (razorpayCount > 0 && razorpayCount !== razorpayKeys.length) errors.push(`Razorpay configuration is partial. Set all six keys or leave all six empty: ${razorpayKeys.join(", ")}.`);
if (process.env.NODE_ENV === "production" && razorpayCount === razorpayKeys.length && process.env.RAZORPAY_KEY_ID?.startsWith("rzp_test_")) warnings.push("Razorpay is using Test Mode keys; live customer payments will not work.");
const emailKeys = ["RESEND_API_KEY", "RESEND_FROM_EMAIL"];
const emailCount = emailKeys.filter((key) => process.env[key]?.trim()).length;
if (emailCount === 1) {
  const message = "Configure both RESEND_API_KEY and RESEND_FROM_EMAIL, or leave both empty.";
  (productionCheck ? errors : warnings).push(message);
}

for (const warning of warnings) console.warn(`WARN  ${warning}`);
if (errors.length) {
  for (const error of errors) console.error(`ERROR ${error}`);
  console.error(`\nEnvironment check failed with ${errors.length} error(s).`);
  process.exit(1);
}
console.log("Environment configuration checks passed.");
if (process.env.NODE_ENV === "production" && razorpayCount === 0) console.log("Razorpay is not configured; paid checkout should remain unavailable.");
