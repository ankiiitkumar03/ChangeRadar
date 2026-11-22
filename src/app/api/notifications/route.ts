import { NextResponse } from "next/server";
import { and, desc, eq, isNull } from "drizzle-orm";

import { getApiSession, serverError, unauthorized } from "@/lib/api";
import { db } from "@/lib/db";
import { notifications } from "@/lib/schema";

export async function GET(request: Request) {
  const session = await getApiSession(request);
  if (!session) return unauthorized();

  try {
    const rows = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, session.user.id))
      .orderBy(desc(notifications.createdAt))
      .limit(60);

    const unread = rows.filter((row) => !row.readAt).length;
    return NextResponse.json({ notifications: rows, unread });
  } catch (error) {
    console.error("Failed to load notifications", error);
    return serverError();
  }
}

export async function PATCH(request: Request) {
  const session = await getApiSession(request);
  if (!session) return unauthorized();

  const body = (await request.json().catch(() => ({}))) as { id?: string };

  try {
    if (body.id) {
      await db
        .update(notifications)
        .set({ readAt: new Date() })
        .where(
          and(
            eq(notifications.id, body.id),
            eq(notifications.userId, session.user.id),
          ),
        );
    } else {
      await db
        .update(notifications)
        .set({ readAt: new Date() })
        .where(
          and(
            eq(notifications.userId, session.user.id),
            isNull(notifications.readAt),
          ),
        );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to mark notifications read", error);
    return serverError();
  }
}
