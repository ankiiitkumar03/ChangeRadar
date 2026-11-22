import { NextResponse } from "next/server";

import {
  findOwnedMonitor,
  getApiSession,
  notFound,
  serverError,
  unauthorized,
} from "@/lib/api";
import { runMonitorCheck } from "@/lib/monitoring";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getApiSession(request);
  if (!session) return unauthorized();

  const { id } = await context.params;

  try {
    const monitor = await findOwnedMonitor(id, session.user.id);
    if (!monitor) return notFound("Monitor not found.");
    if (monitor.status === "paused") {
      return NextResponse.json(
        { error: "Resume this monitor before running a check." },
        { status: 400 },
      );
    }

    if (monitor.lastCheckedAt && Date.now() - monitor.lastCheckedAt.getTime() < 8000) {
      return NextResponse.json(
        { error: "This monitor was checked moments ago. Try again in a few seconds." },
        { status: 429 },
      );
    }

    const result = await runMonitorCheck(monitor);
    return NextResponse.json({ check: result });
  } catch (error) {
    console.error("Manual check failed", error);
    return serverError("The check could not run. Please try again.");
  }
}
