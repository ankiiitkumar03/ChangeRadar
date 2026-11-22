import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  GitCompareArrows,
  Globe2,
} from "lucide-react";
import { and, desc, eq, gte, sql } from "drizzle-orm";

import { ActivityChart, type ActivityPoint } from "@/components/dashboard/activity-chart";
import {
  EmptyState,
  PageHeader,
  SectionCard,
  StatCard,
} from "@/components/dashboard/ui";
import { db } from "@/lib/db";
import { hostnameOf } from "@/lib/format";
import { checkRuns, monitors } from "@/lib/schema";
import { requireSession } from "@/lib/session";

export default async function AnalyticsPage() {
  const session = await requireSession("/dashboard/analytics");
  const userId = session.user.id;
  const since = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000);
  since.setUTCHours(0, 0, 0, 0);

  const [summaryRows, dailyRows, monitorRows] = await Promise.all([
    db
      .select({
        checks: sql<number>`count(*)::int`,
        changed: sql<number>`count(*) filter (where ${checkRuns.status} = 'changed')::int`,
        failed: sql<number>`count(*) filter (where ${checkRuns.status} = 'failed')::int`,
        unchanged: sql<number>`count(*) filter (where ${checkRuns.status} = 'unchanged')::int`,
      })
      .from(checkRuns)
      .where(and(eq(checkRuns.userId, userId), gte(checkRuns.createdAt, since))),
    db
      .select({
        day: sql<string>`to_char(${checkRuns.createdAt}, 'YYYY-MM-DD')`,
        checks: sql<number>`count(*)::int`,
        changes: sql<number>`count(*) filter (where ${checkRuns.status} = 'changed')::int`,
      })
      .from(checkRuns)
      .where(and(eq(checkRuns.userId, userId), gte(checkRuns.createdAt, since)))
      .groupBy(sql`1`)
      .orderBy(sql`1`),
    db
      .select({
        id: monitors.id,
        name: monitors.name,
        url: monitors.url,
        status: monitors.status,
        lastCheckedAt: monitors.lastCheckedAt,
        checks: sql<number>`count(${checkRuns.id})::int`,
        changes: sql<number>`count(${checkRuns.id}) filter (where ${checkRuns.status} = 'changed')::int`,
        failures: sql<number>`count(${checkRuns.id}) filter (where ${checkRuns.status} = 'failed')::int`,
      })
      .from(monitors)
      .leftJoin(
        checkRuns,
        and(
          eq(checkRuns.monitorId, monitors.id),
          gte(checkRuns.createdAt, since),
        ),
      )
      .where(eq(monitors.userId, userId))
      .groupBy(monitors.id)
      .orderBy(desc(sql`count(${checkRuns.id}) filter (where ${checkRuns.status} = 'changed')`), desc(monitors.createdAt))
      .limit(8),
  ]);

  const summary = summaryRows[0] ?? { checks: 0, changed: 0, failed: 0, unchanged: 0 };
  const totalChecks = Number(summary.checks ?? 0);
  const changedChecks = Number(summary.changed ?? 0);
  const failedChecks = Number(summary.failed ?? 0);
  const successfulChecks = Math.max(0, totalChecks - failedChecks);
  const successRate = totalChecks > 0 ? Math.round((successfulChecks / totalChecks) * 100) : 0;
  const dailyMap = new Map(
    dailyRows.map((row) => [row.day, { checks: Number(row.checks), changes: Number(row.changes) }]),
  );
  const activity: ActivityPoint[] = Array.from({ length: 30 }, (_, index) => {
    const day = new Date(since);
    day.setUTCDate(since.getUTCDate() + index);
    const key = day.toISOString().slice(0, 10);
    const value = dailyMap.get(key);
    return { day: key, checks: value?.checks ?? 0, changes: value?.changes ?? 0 };
  });
  const hasMonitors = monitorRows.length > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="Understand monitoring activity, detected changes and reliability across your websites."
        actions={
          <Link
            href="/dashboard/monitors"
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/10 px-3 text-[12px] text-white/65 transition-colors hover:bg-white/[0.05] hover:text-white"
          >
            View monitors <ArrowRight className="size-3.5" />
          </Link>
        }
      />

      <div className="flex items-center gap-2 text-[11px] text-white/35">
        <span className="size-1.5 rounded-full bg-emerald-400" />
        Last 30 days <span className="text-white/15">·</span> Updated when you open this page
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total checks" value={totalChecks.toLocaleString()} hint="All completed and failed runs" icon={Activity} tone="violet" />
        <StatCard label="Changes detected" value={changedChecks.toLocaleString()} hint="Checks that found a meaningful change" icon={GitCompareArrows} tone="cyan" />
        <StatCard label="Check success rate" value={`${successRate}%`} hint={`${successfulChecks.toLocaleString()} checks without an error`} icon={CheckCircle2} tone={successRate >= 95 ? "cyan" : "default"} />
        <StatCard label="Failed checks" value={failedChecks.toLocaleString()} hint="Runs that need attention" icon={AlertTriangle} tone={failedChecks > 0 ? "amber" : "default"} />
      </div>

      <SectionCard
        title="Monitoring activity"
        description="Daily checks and detected changes over the last 30 days"
      >
        <div className="px-3 pb-4 pt-2">
          <ActivityChart data={activity} />
          <div className="mt-1 flex flex-wrap items-center justify-center gap-5 text-[10.5px] text-white/40">
            <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-violet-400" /> Checks</span>
            <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-cyan-400" /> Changes</span>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Monitor performance"
        description="Your websites ranked by detected changes in the selected period"
        action={<span className="text-[10px] text-white/30">Top 8</span>}
      >
        {!hasMonitors ? (
          <div className="p-4">
            <EmptyState
              icon={Globe2}
              title="No monitors to analyze yet"
              description="Add a website to start collecting monitoring analytics."
              action={{ href: "/dashboard/monitors/new", label: "Add your first website" }}
            />
          </div>
        ) : (
          <div className="divide-y divide-white/[0.05]">
            {monitorRows.map((monitor) => {
              const checks = Number(monitor.checks ?? 0);
              const changes = Number(monitor.changes ?? 0);
              const failures = Number(monitor.failures ?? 0);
              const changeRate = checks > 0 ? Math.round((changes / checks) * 100) : 0;
              return (
                <Link
                  key={monitor.id}
                  href={`/dashboard/monitors/${monitor.id}`}
                  className="flex flex-col gap-3 px-4 py-3.5 transition-colors hover:bg-white/[0.025] sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[12.5px] font-medium text-white/80">{monitor.name}</p>
                    <p className="mt-0.5 truncate text-[10.5px] text-white/30">{hostnameOf(monitor.url)}</p>
                  </div>
                  <div className="grid grid-cols-4 gap-3 sm:w-[420px] sm:shrink-0">
                    <div><p className="font-mono text-[13px] tabular-nums text-white/80">{checks}</p><p className="text-[9.5px] text-white/30">Checks</p></div>
                    <div><p className="font-mono text-[13px] tabular-nums text-cyan-300">{changes}</p><p className="text-[9.5px] text-white/30">Changes</p></div>
                    <div><p className="font-mono text-[13px] tabular-nums text-amber-300">{failures}</p><p className="text-[9.5px] text-white/30">Failures</p></div>
                    <div><p className="font-mono text-[13px] tabular-nums text-white/65">{changeRate}%</p><p className="text-[9.5px] text-white/30">Change rate</p></div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </SectionCard>

      <div className="grid gap-3 md:grid-cols-2">
        <SectionCard title="What these metrics mean" description="A quick guide to your analytics">
          <div className="space-y-3 px-4 py-4 text-[11.5px] leading-relaxed text-white/45">
            <p><strong className="font-medium text-white/75">Success rate</strong> counts baseline, unchanged and changed checks as successful; failed runs are excluded.</p>
            <p><strong className="font-medium text-white/75">Change rate</strong> is the share of a monitor&apos;s check runs that detected a meaningful change.</p>
            <p><strong className="font-medium text-white/75">Activity</strong> is based on completed check runs, not page views or estimated traffic.</p>
          </div>
        </SectionCard>
        <SectionCard title="Make your radar more useful" description="Next steps based on your monitoring data">
          <div className="space-y-3 px-4 py-4">
            <Link href="/dashboard/monitors/new" className="flex items-center justify-between gap-3 text-[11.5px] text-violet-300 hover:text-violet-200">
              Add another important page <ArrowRight className="size-3.5" />
            </Link>
            <Link href="/dashboard/changes" className="flex items-center justify-between gap-3 text-[11.5px] text-violet-300 hover:text-violet-200">
              Review all detected changes <ArrowRight className="size-3.5" />
            </Link>
            <Link href="/settings" className="flex items-center justify-between gap-3 text-[11.5px] text-violet-300 hover:text-violet-200">
              Configure alert preferences <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
