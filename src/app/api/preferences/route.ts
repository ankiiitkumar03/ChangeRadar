import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { getApiSession, serverError, unauthorized } from "@/lib/api";
import { db } from "@/lib/db";
import { userPreferences } from "@/lib/schema";

export async function GET(request: Request) {
  const session = await getApiSession(request);
  if (!session) return unauthorized();

  try {
    await db.insert(userPreferences).values({ userId: session.user.id }).onConflictDoNothing();
    const [preferences] = await db
      .select({ emailAlerts: userPreferences.emailAlerts })
      .from(userPreferences)
      .where(eq(userPreferences.userId, session.user.id))
      .limit(1);
    return NextResponse.json({ emailAlerts: preferences?.emailAlerts ?? true });
  } catch (error) {
    console.error("Failed to load account preferences", error);
    return serverError();
  }
}

export async function PATCH(request: Request) {
  const session = await getApiSession(request);
  if (!session) return unauthorized();

  const body = (await request.json().catch(() => null)) as { emailAlerts?: unknown } | null;
  if (!body || typeof body.emailAlerts !== "boolean") {
    return NextResponse.json({ error: "emailAlerts must be a boolean." }, { status: 400 });
  }

  try {
    await db
      .insert(userPreferences)
      .values({ userId: session.user.id, emailAlerts: body.emailAlerts })
      .onConflictDoUpdate({
        target: userPreferences.userId,
        set: { emailAlerts: body.emailAlerts, updatedAt: new Date() },
      });
    return NextResponse.json({ ok: true, emailAlerts: body.emailAlerts });
  } catch (error) {
    console.error("Failed to update account preferences", error);
    return serverError();
  }
}
