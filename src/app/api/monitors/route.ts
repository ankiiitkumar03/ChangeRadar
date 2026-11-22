import { NextResponse } from "next/server";
import { and, count, eq } from "drizzle-orm";
import { z } from "zod";

import {
  badRequest,
  getApiSession,
  serverError,
  unauthorized,
  zodFields,
} from "@/lib/api";
import { db } from "@/lib/db";
import {
  MonitorValidationError,
  normalizeMonitorUrl,
  runMonitorCheck,
} from "@/lib/monitoring";
import { isFrequency, planAllowsFrequency } from "@/lib/plans";
import { monitors } from "@/lib/schema";
import { ensureSubscription } from "@/lib/subscriptions";
import { getPlan } from "@/lib/plans";

const createMonitorSchema = z.object({
  name: z.string().trim().min(1, "Give this monitor a name").max(80),
  url: z.string().trim().min(1, "Enter the page URL").max(2048),
  frequency: z.string().default("6h"),
  keywords: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
  ignoreKeywords: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
  notifyEmail: z.boolean().default(true),
});

export async function GET(request: Request) {
  const session = await getApiSession(request);
  if (!session) return unauthorized();

  try {
    const rows = await db
      .select()
      .from(monitors)
      .where(eq(monitors.userId, session.user.id))
      .orderBy(monitors.createdAt);

    return NextResponse.json({ monitors: rows });
  } catch (error) {
    console.error("Failed to list monitors", error);
    return serverError();
  }
}

export async function POST(request: Request) {
  const session = await getApiSession(request);
  if (!session) return unauthorized();

  const parsed = createMonitorSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return badRequest("Check the highlighted fields.", zodFields(parsed.error));
  }

  if (!isFrequency(parsed.data.frequency)) {
    return badRequest("Choose a supported check frequency.", {
      frequency: ["Choose a supported check frequency"],
    });
  }

  try {
    const subscription = await ensureSubscription(session.user.id);
    const plan = getPlan(subscription.plan);

    if (!planAllowsFrequency(plan.id, parsed.data.frequency)) {
      return badRequest(
        "Hourly checks are available on Pro and Business plans.",
        { frequency: ["Upgrade to Pro or Business for hourly checks"] },
      );
    }

    const [usage] = await db
      .select({ value: count() })
      .from(monitors)
      .where(eq(monitors.userId, session.user.id));

    if (Number(usage?.value ?? 0) >= plan.monitorLimit) {
      return NextResponse.json(
        {
          error: `Your ${plan.name} plan includes ${plan.monitorLimit} monitors. Upgrade to add more.`,
          code: "PLAN_LIMIT",
        },
        { status: 402 },
      );
    }

    const url = normalizeMonitorUrl(parsed.data.url);

    const [duplicate] = await db
      .select({ id: monitors.id })
      .from(monitors)
      .where(and(eq(monitors.userId, session.user.id), eq(monitors.url, url)))
      .limit(1);

    if (duplicate) {
      return badRequest("You are already monitoring this URL.", {
        url: ["This URL is already in your monitors"],
      });
    }

    const [monitor] = await db
      .insert(monitors)
      .values({
        userId: session.user.id,
        name: parsed.data.name,
        url,
        frequency: parsed.data.frequency,
        keywords: parsed.data.keywords.map((word) => word.trim()).filter(Boolean).slice(0, 20),
        ignoreKeywords: parsed.data.ignoreKeywords
          .map((word) => word.trim())
          .filter(Boolean)
          .slice(0, 20),
        notifyEmail: parsed.data.notifyEmail,
        nextCheckAt: new Date(),
      })
      .returning();

    const result = await runMonitorCheck(monitor);

    return NextResponse.json({ monitor, check: result }, { status: 201 });
  } catch (error) {
    if (error instanceof MonitorValidationError) {
      return badRequest(error.message, { url: [error.message] });
    }
    if (error instanceof Error && error.message.includes("duplicate key")) {
      return badRequest("You are already monitoring this URL.");
    }
    console.error("Failed to create monitor", error);
    return serverError("We could not add this monitor. Please try again.");
  }
}
