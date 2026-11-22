import { redirect } from "next/navigation";
import { count, eq } from "drizzle-orm";

import { AddMonitorForm } from "@/components/dashboard/add-monitor-form";
import { db } from "@/lib/db";
import { getPlan } from "@/lib/plans";
import { monitors } from "@/lib/schema";
import { requireSession } from "@/lib/session";
import { ensureSubscription } from "@/lib/subscriptions";

export const metadata = { title: "Add website · ChangeRadar" };

export default async function NewMonitorPage() {
  const session = await requireSession("/dashboard/monitors/new");
  const subscription = await ensureSubscription(session.user.id);
  const plan = getPlan(subscription.plan);

  const [usage] = await db
    .select({ value: count() })
    .from(monitors)
    .where(eq(monitors.userId, session.user.id));

  const used = Number(usage?.value ?? 0);
  if (used >= plan.monitorLimit) redirect("/dashboard/billing?limit=1");

  return (
    <AddMonitorForm
      planId={plan.id}
      planName={plan.name}
      remaining={plan.monitorLimit - used}
    />
  );
}
