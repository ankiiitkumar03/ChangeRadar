import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";

import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function missingCriticalConfiguration() {
  return ["DATABASE_URL", "BETTER_AUTH_SECRET", "BETTER_AUTH_URL", "NEXT_PUBLIC_APP_URL", "CRON_SECRET"]
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
