import "server-only";

import { NextResponse } from "next/server";

import { auth } from "./auth";
import { db } from "./db";
import { monitors, type Monitor } from "./schema";
import { eq, and } from "drizzle-orm";

export async function getApiSession(request: Request) {
  return auth.api.getSession({ headers: request.headers });
}

export function unauthorized() {
  return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
}

export function badRequest(error: string, fields?: Record<string, string[]>) {
  return NextResponse.json({ error, fields }, { status: 400 });
}

export function forbidden(error: string) {
  return NextResponse.json({ error }, { status: 403 });
}

export function notFound(error = "Not found.") {
  return NextResponse.json({ error }, { status: 404 });
}

export function serverError(error = "Something went wrong. Please try again.") {
  return NextResponse.json({ error }, { status: 500 });
}

export async function findOwnedMonitor(
  monitorId: string,
  userId: string,
): Promise<Monitor | null> {
  const [monitor] = await db
    .select()
    .from(monitors)
    .where(and(eq(monitors.id, monitorId), eq(monitors.userId, userId)))
    .limit(1);
  return monitor ?? null;
}

export function zodFields(error: { issues: Array<{ path: PropertyKey[]; message: string }> }) {
  const fields: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    fields[key] = [...(fields[key] ?? []), issue.message];
  }
  return fields;
}
