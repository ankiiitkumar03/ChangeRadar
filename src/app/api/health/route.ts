import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";

import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function missingCriticalConfiguration() {
  const required = ["DATABASE_URL", "BETTER_AUTH_SECRET", "BETTER_AUTH_URL", "NEXT_PUBLIC_APP_URL"];
  // Local manual checks do not use the scheduled worker. Production readiness
  // includes cron because the deployed app promises automatic monitoring.
  if (process.env.NODE_ENV === "production") required.push("CRON_SECRET");
  return required
    .filter((key) => !process.env[key]?.trim());
}

export async function GET() {
  const missing = missingCriticalConfiguration();
  if (missing.length) {
    return NextResponse.json(
      { status: "not_ready", checks: { configuration: "failed", database: "not_checked" }, missing },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
  try {
    await db.execute(sql`select 1`);
    return NextResponse.json(
      { status: "ok", checks: { configuration: "ok", database: "ok" }, timestamp: new Date().toISOString() },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Health check database probe failed", error);
    return NextResponse.json(
      { status: "not_ready", checks: { configuration: "ok", database: "failed" } },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
