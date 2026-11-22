import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { Globe2, Plus, Sparkles } from "lucide-react";

import { MonitorBrowser } from "@/components/dashboard/monitor-browser";
import { EmptyState, PageHeader, SetupNotice } from "@/components/dashboard/ui";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { getPlan } from "@/lib/plans";
import { changes, monitors } from "@/lib/schema";
import { requireSession } from "@/lib/session";
import { ensureSubscription } from "@/lib/subscriptions";

export default async function MonitorsPage() {
  const session = await requireSession("/dashboard/monitors");
  const subscription = await ensureSubscription(session.user.id);
  const plan = getPlan(subscription.plan);

  const [monitorRows, changeRows] = await Promise.all([
    db
      .select()
      .from(monitors)
      .where(eq(monitors.userId, session.user.id))
      .orderBy(desc(monitors.createdAt)),
    db
      .select({
        monitorId: changes.monitorId,
        summary: changes.summary,
        aiSummary: changes.aiSummary,
        detectedAt: changes.detectedAt,
      })
      .from(changes)
      .where(eq(changes.userId, session.user.id))
      .orderBy(desc(changes.detectedAt))
      .limit(1000),
  ]);

  const latestChangeByMonitor = new Map<string, { summary: string; detectedAt: Date }>();
  for (const change of changeRows) {
    if (!latestChangeByMonitor.has(change.monitorId)) {
      latestChangeByMonitor.set(change.monitorId, {
        summary: change.aiSummary ?? change.summary,
        detectedAt: change.detectedAt,
      });
    }
  }

  const atLimit = monitorRows.length >= plan.monitorLimit;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Monitors"
        description={`${monitorRows.length} of ${plan.monitorLimit} monitors used on the ${plan.name} plan. Pages are checked every six hours by default.`}
        actions={
          <Button asChild className="rounded-lg" disabled={atLimit}>
            <Link href={atLimit ? "/dashboard/billing" : "/dashboard/monitors/new"}>
              {atLimit ? <Sparkles className="size-4" /> : <Plus className="size-4" />}
              {atLimit ? "Upgrade for more" : "Add website"}
            </Link>
          </Button>
        }
      />

      {atLimit && (
        <SetupNotice
          tone="violet"
          title="You have reached your plan limit"
          description="Pause or delete a monitor, or upgrade your plan to keep monitoring more pages."
        />
      )}

      {monitorRows.length === 0 ? (
        <EmptyState
          icon={Globe2}
          title="No websites are being monitored yet"
          description="Add a public URL to record a baseline. ChangeRadar will check it on schedule and keep every meaningful change in your history."
          action={{ href: "/dashboard/monitors/new", label: "Add your first website" }}
        />
      ) : (
        <MonitorBrowser
          monitors={monitorRows}
          latestChanges={Object.fromEntries(latestChangeByMonitor)}
        />
      )}
    </div>
  );
}
