import { NextResponse } from "next/server";

import { retryPendingNotificationEmails, runDueMonitors } from "@/lib/monitoring";

export const maxDuration = 60;

function authorize(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return "unconfigured" as const;

  const header = request.headers.get("authorization") ?? "";
  const bearer = header.replace(/^Bearer\s+/i, "");
  const provided = bearer || request.headers.get("x-cron-secret");

  return provided === secret ? "ok" : "denied";
}

async function handle(request: Request) {
  const access = authorize(request);

  if (access === "unconfigured") {
    return NextResponse.json(
      {
        error:
          "Scheduled checks are not configured. Set CRON_SECRET and call this endpoint from your scheduler every hour.",
        setupRequired: true,
      },
      { status: 503 },
    );
  }

  if (access === "denied") {
    return NextResponse.json({ error: "Invalid cron secret." }, { status: 401 });
  }

  const started = Date.now();
  let emailRetries = { attempted: 0, sent: 0, failed: 0 };
  try {
    emailRetries = await retryPendingNotificationEmails(3);
  } catch (error) {
    // A transient email-worker issue must not block scheduled website checks.
    console.error("Notification retry worker failed", error);
  }
  const results = await runDueMonitors(10);

  return NextResponse.json({
    ok: true,
    checked: results.length,
    emailRetries,
    durationMs: Date.now() - started,
    results,
  });
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
