import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";

import {
  badRequest,
  findOwnedMonitor,
  getApiSession,
  notFound,
  serverError,
  unauthorized,
  zodFields,
} from "@/lib/api";
import { db } from "@/lib/db";
import { isFrequency, planAllowsFrequency } from "@/lib/plans";
import { changes, checkRuns, monitors, snapshots } from "@/lib/schema";
import { ensureSubscription } from "@/lib/subscriptions";
import { getPlan } from "@/lib/plans";

const updateMonitorSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  frequency: z.string().optional(),
  keywords: z.array(z.string().trim().min(1).max(80)).max(20).optional(),
  ignoreKeywords: z.array(z.string().trim().min(1).max(80)).max(20).optional(),
  notifyEmail: z.boolean().optional(),
  status: z.enum(["active", "paused"]).optional(),
});

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getApiSession(request);
  if (!session) return unauthorized();

  const { id } = await context.params;

  try {
    const monitor = await findOwnedMonitor(id, session.user.id);
    if (!monitor) return notFound("Monitor not found.");

    const [changeRows, snapshotRows, runRows] = await Promise.all([
      db
        .select()
        .from(changes)
        .where(eq(changes.monitorId, id))
        .orderBy(desc(changes.detectedAt))
        .limit(50),
      db
        .select({
          id: snapshots.id,
          createdAt: snapshots.createdAt,
          wordCount: snapshots.wordCount,
        })
        .from(snapshots)
        .where(eq(snapshots.monitorId, id))
        .orderBy(desc(snapshots.createdAt))
        .limit(25),
      db
        .select()
        .from(checkRuns)
        .where(eq(checkRuns.monitorId, id))
        .orderBy(desc(checkRuns.createdAt))
        .limit(30),
    ]);

    return NextResponse.json({
      monitor,
      changes: changeRows,
      snapshots: snapshotRows,
      checks: runRows,
    });
  } catch (error) {
    console.error("Failed to load monitor", error);
    return serverError();
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getApiSession(request);
  if (!session) return unauthorized();

  const { id } = await context.params;
  const parsed = updateMonitorSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return badRequest("Check the highlighted fields.", zodFields(parsed.error));
  }

  try {
    const monitor = await findOwnedMonitor(id, session.user.id);
    if (!monitor) return notFound("Monitor not found.");

    if (parsed.data.frequency) {
      if (!isFrequency(parsed.data.frequency)) {
        return badRequest("Choose a supported check frequency.", {
          frequency: ["Choose a supported check frequency"],
        });
      }
      const subscription = await ensureSubscription(session.user.id);
      const plan = getPlan(subscription.plan);
      if (!planAllowsFrequency(plan.id, parsed.data.frequency)) {
        return badRequest("Hourly checks are available on Pro and Business plans.", {
          frequency: ["Upgrade to Pro or Business for hourly checks"],
        });
      }
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (parsed.data.name !== undefined) updates.name = parsed.data.name;
    if (parsed.data.frequency !== undefined) updates.frequency = parsed.data.frequency;
    if (parsed.data.keywords !== undefined) {
      updates.keywords = parsed.data.keywords.map((word) => word.trim()).filter(Boolean).slice(0, 20);
    }
    if (parsed.data.ignoreKeywords !== undefined) {
      updates.ignoreKeywords = parsed.data.ignoreKeywords
        .map((word) => word.trim())
        .filter(Boolean)
        .slice(0, 20);
    }
    if (parsed.data.notifyEmail !== undefined) {
      updates.notifyEmail = parsed.data.notifyEmail;
    }
    if (parsed.data.status !== undefined) {
      updates.status = parsed.data.status;
      if (parsed.data.status === "active") updates.nextCheckAt = new Date();
    }

    const [updated] = await db
      .update(monitors)
      .set(updates)
      .where(eq(monitors.id, id))
      .returning();

    return NextResponse.json({ monitor: updated });
  } catch (error) {
    console.error("Failed to update monitor", error);
    return serverError("We could not save your changes. Please try again.");
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getApiSession(request);
  if (!session) return unauthorized();

  const { id } = await context.params;

  try {
    const monitor = await findOwnedMonitor(id, session.user.id);
    if (!monitor) return notFound("Monitor not found.");

    await db.delete(monitors).where(eq(monitors.id, id));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to delete monitor", error);
    return serverError("We could not delete this monitor. Please try again.");
  }
}
