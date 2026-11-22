import Link from "next/link";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  BellRing,
  BrainCircuit,
  CalendarClock,
  Globe2,
  GitCompareArrows,
  Mail,
  Plus,
  Radar,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { and, count, desc, eq, gte, sql } from "drizzle-orm";

import { ActivityChart, type ActivityPoint } from "@/components/dashboard/activity-chart";
import { Favicon } from "@/components/dashboard/favicon";
import {
  EmptyState,
  PageHeader,
  SectionCard,
  StatCard,
  StatusBadge,
} from "@/components/dashboard/ui";
import { Button } from "@/components/ui/button";
import { isAiConfigured } from "@/lib/ai";
import { db } from "@/lib/db";
import { isEmailConfigured } from "@/lib/email";
import { hostnameOf, pluralize, timeAgo } from "@/lib/format";
import { getPlan } from "@/lib/plans";
import {
  changes,
  checkRuns,
  monitors,
  notifications,
} from "@/lib/schema";
import { requireSession } from "@/lib/session";
import { ensureSubscription } from "@/lib/subscriptions";

function IntegrationRow({
  icon: Icon,
  label,
  detail,
  connected,
}: {
  icon: typeof Mail;
  label: string;
  detail: string;
  connected: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-white/[0.05] px-4 py-3 last:border-0">
      <div className="flex items-start gap-2.5">
        <Icon className="mt-0.5 size-3.5 text-white/30" />
        <div>
          <p className="text-[12px] font-medium text-white/70">{label}</p>
          <p className="mt-0.5 text-[10.5px] leading-relaxed text-white/30">{detail}</p>
        </div>
      </div>
      <span
        className={`shrink-0 rounded-full border px-2 py-0.5 text-[9.5px] font-medium ${
          connected
            ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-300"
            : "border-amber-400/20 bg-amber-500/10 text-amber-300"
        }`}
      >
        {connected ? "Connected" : "Setup needed"}
      </span>
    </div>
  );
}

export default async function DashboardPage() {
  const session = await requireSession("/dashboard");
  const userId = session.user.id;
  const subscription = await ensureSubscription(userId);
  const plan = getPlan(subscription.plan);

  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  since.setUTCDate(since.getUTCDate() - 13);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    monitorRows,
    changeRows,
    notificationRows,
    latestChangeRows,
    activityRows,
    [recentAlertCount],
  ] = await Promise.all([
    db
      .select()
      .from(monitors)
      .where(eq(monitors.userId, userId))
      .orderBy(desc(monitors.createdAt)),
    db
      .select({ monitorId: changes.monitorId })
      .from(changes)
      .where(eq(changes.userId, userId))
      .groupBy(changes.monitorId),
    db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(5),
    db
      .select({
        id: changes.id,
        summary: changes.summary,
        aiSummary: changes.aiSummary,
        detectedAt: changes.detectedAt,
        changeScore: changes.changeScore,
        monitorId: changes.monitorId,
        monitorName: monitors.name,
        monitorUrl: monitors.url,
      })
      .from(changes)
      .innerJoin(monitors, eq(changes.monitorId, monitors.id))
      .where(eq(changes.userId, userId))
      .orderBy(desc(changes.detectedAt))
      .limit(5),
    db
      .select({
        day: sql<string>`to_char(${checkRuns.createdAt}, 'YYYY-MM-DD')`,
        checks: sql<number>`count(*)`,
        changes: sql<number>`count(*) filter (where ${checkRuns.status} = 'changed')`,
      })
      .from(checkRuns)
      .where(and(eq(checkRuns.userId, userId), gte(checkRuns.createdAt, since)))
      .groupBy(sql`1`)
      .orderBy(sql`1`),
    db
      .select({ value: count() })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          gte(notifications.createdAt, weekAgo),
        ),
      ),
  ]);

  const totalMonitors = monitorRows.length;
  const withChanges = changeRows.length;
  const withoutChanges = Math.max(0, totalMonitors - withChanges);
  const remaining = Math.max(0, plan.monitorLimit - totalMonitors);
  const activeMonitors = monitorRows.filter((monitor) => monitor.status === "active").length;

  const activityByDay = new Map(
    activityRows.map((row) => [
      row.day,
      { checks: Number(row.checks), changes: Number(row.changes) },
    ]),
  );

  const activity: ActivityPoint[] = Array.from({ length: 14 }).map((_, index) => {
    const date = new Date(since);
    date.setUTCDate(since.getUTCDate() + index);
    const key = date.toISOString().slice(0, 10);
    const point = activityByDay.get(key);
    return {
      day: key,
      checks: point?.checks ?? 0,
      changes: point?.changes ?? 0,
    };
  });

  const latestChangeByMonitor = new Map(
    latestChangeRows.map((change) => [change.monitorId, change]),
  );

  const emailReady = isEmailConfigured();
  const aiReady = isAiConfigured();
  const cronReady = Boolean(process.env.CRON_SECRET);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Good to see you, ${session.user.name.split(" ")[0]}.`}
        description="Here is what your radar picked up and what is coming next."
        actions={
          <Button asChild className="rounded-lg">
            <Link href="/dashboard/monitors/new">
              <Plus className="size-4" />
              Add website
            </Link>
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Monitored websites"
          value={totalMonitors}
          hint={`${activeMonitors} actively checking`}
          icon={Globe2}
          tone="violet"
        />
        <StatCard
          label="With detected changes"
          value={withChanges}
          hint="At least one recorded change"
          icon={GitCompareArrows}
          tone="cyan"
        />
        <StatCard
          label="No changes yet"
          value={withoutChanges}
          hint="Baseline recorded, waiting for a diff"
          icon={Activity}
        />
        <StatCard
          label="Alerts this week"
          value={Number(recentAlertCount?.value ?? 0)}
          hint={emailReady ? "Email delivery connected" : "In-app only until email is set up"}
          icon={BellRing}
          tone={emailReady ? "default" : "amber"}
        />
      </div>

      {totalMonitors === 0 && (
        <div className="relative overflow-hidden rounded-2xl border border-violet-400/20 bg-gradient-to-br from-violet-600/[0.14] via-white/[0.02] to-cyan-500/[0.06] p-6 sm:p-8">
          <div className="pointer-events-none absolute inset-0 grid-lines opacity-40" />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-xl">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-400/20 bg-violet-500/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-violet-200">
                <Radar className="size-3" />
                Your radar is quiet
              </span>
              <h2 className="mt-3 text-[22px] font-semibold tracking-[-0.03em] text-white">
                Your first website is the start of your radar.
              </h2>
              <p className="mt-2 max-w-[52ch] text-[13px] leading-relaxed text-white/45">
                Add a public page, let ChangeRadar save its baseline, and get a clear
                before-and-after alert when meaningful text changes. No code or
                browser extension needed.
              </p>
              <ol className="mt-5 grid gap-3 sm:grid-cols-3">
                {[
                  { title: "Choose a page", detail: "Pricing, product, changelog or careers" },
                  { title: "Baseline saved", detail: "We capture the current readable content" },
                  { title: "Stay informed", detail: "See future changes and their exact diff" },
                ].map((step, index) => (
                  <li key={step.title} className="flex items-start gap-2.5 rounded-lg border border-white/[0.07] bg-black/10 p-3">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full border border-violet-300/20 bg-violet-400/10 font-mono text-[9px] text-violet-200">
                      {index + 1}
                    </span>
                    <span>
                      <span className="block text-[11px] font-medium text-white/70">{step.title}</span>
                      <span className="mt-1 block text-[10px] leading-relaxed text-white/35">{step.detail}</span>
                    </span>
                  </li>
                ))}
              </ol>
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[11px] text-white/35">
                <span>3 monitors on Free</span>
                <span>Automatic baseline</span>
                <span>Full change history</span>
              </div>
            </div>
            <Button asChild size="lg" className="h-11 shrink-0 rounded-lg">
              <Link href="/dashboard/monitors/new">
                Add your first website
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.65fr_1fr]">
        <SectionCard
          title="Monitoring activity"
          description="Checks and detected changes over the last 14 days."
          action={
            <div className="flex items-center gap-3 text-[10px] text-white/35">
              <span className="inline-flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-violet-400" /> Checks
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-cyan-400" /> Changes
              </span>
            </div>
          }
        >
          <div className="p-2 pb-3">
            <ActivityChart data={activity} />
          </div>
        </SectionCard>

        <SectionCard
          title="Plan & coverage"
          action={
            <Link
              href="/dashboard/billing"
              className="inline-flex items-center gap-1 text-[11px] text-violet-300 hover:text-violet-200"
            >
              Manage <ArrowUpRight className="size-3" />
            </Link>
          }
        >
          <div className="p-4">
            <div className="flex items-baseline justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.14em] text-white/30">
                  {plan.name} plan
                </p>
                <p className="mt-1 font-mono text-[26px] font-semibold tabular-nums leading-none text-white">
                  {remaining}
                  <span className="ml-1 text-[11px] font-normal text-white/35">
                    monitors left
                  </span>
                </p>
              </div>
              <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-white/45">
                {totalMonitors} / {plan.monitorLimit}
              </span>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400"
                style={{
                  width: `${Math.max(4, Math.min(100, (totalMonitors / plan.monitorLimit) * 100))}%`,
                }}
              />
            </div>
            <div className="mt-4 space-y-2 text-[11.5px]">
              <div className="flex items-center justify-between">
                <span className="text-white/30">Default frequency</span>
                <span className="text-white/55">Every 6 hours</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/30">History retained</span>
                <span className="text-white/55">All snapshots</span>
              </div>
            </div>
            {remaining > 0 ? (
              <Button asChild variant="outline" size="sm" className="mt-4 w-full rounded-lg border-white/10 bg-white/[0.02] text-[11.5px]">
                <Link href="/dashboard/monitors/new">
                  <Plus className="size-3.5" />
                  Add a monitor
                </Link>
              </Button>
            ) : (
              <Button asChild size="sm" className="mt-4 w-full rounded-lg">
                <Link href="/dashboard/billing">
                  <Sparkles className="size-3.5" />
                  Upgrade for more monitors
                </Link>
              </Button>
            )}
          </div>
        </SectionCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.65fr_1fr]">
        <SectionCard
          title="Latest detected changes"
          description="The most recent meaningful differences across your monitors."
          action={
            <Link
              href="/dashboard/changes"
              className="inline-flex items-center gap-1 text-[11px] text-violet-300 hover:text-violet-200"
            >
              All changes <ArrowRight className="size-3" />
            </Link>
          }
        >
          {latestChangeRows.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon={GitCompareArrows}
                title="No changes detected yet"
                description={
                  totalMonitors > 0
                    ? "Your monitors are being checked. When a page changes meaningfully, the diff will appear here."
                    : "Add a monitor and ChangeRadar will start recording changes as soon as they happen."
                }
                action={
                  totalMonitors > 0
                    ? undefined
                    : { href: "/dashboard/monitors/new", label: "Add website" }
                }
              />
            </div>
          ) : (
            <div className="divide-y divide-white/[0.05]">
              {latestChangeRows.map((change) => (
                <Link
                  key={change.id}
                  href={`/dashboard/monitors/${change.monitorId}`}
                  className="group flex items-start gap-3 px-4 py-3 transition-colors hover:bg-white/[0.025]"
                >
                  <Favicon url={change.monitorUrl} name={change.monitorName} className="mt-0.5 size-7 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate text-[12.5px] font-medium text-white/80 group-hover:text-white">
                        {change.monitorName}
                      </p>
                      <span className="shrink-0 text-[10px] text-white/25">
                        {timeAgo(change.detectedAt)}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-[11.5px] leading-relaxed text-white/40">
                      {change.aiSummary ?? change.summary}
                    </p>
                    <p className="mt-1.5 flex items-center gap-2 text-[9.5px] text-white/25">
                      <span>{hostnameOf(change.monitorUrl)}</span>
                      <span className="size-0.5 rounded-full bg-white/25" />
                      <span>{change.changeScore}% of text changed</span>
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </SectionCard>

        <div className="space-y-4">
          <SectionCard
            title="Recent alerts"
            action={
              <Link
                href="/dashboard/notifications"
                className="text-[11px] text-violet-300 hover:text-violet-200"
              >
                View all
              </Link>
            }
          >
            {notificationRows.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <BellRing className="mx-auto size-4 text-white/20" />
                <p className="mt-2 text-[11.5px] text-white/35">
                  Alerts will show up here.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.05]">
                {notificationRows.map((notification) => (
                  <div key={notification.id} className="px-4 py-2.5">
                    <div className="flex items-start gap-2">
                      {!notification.readAt && (
                        <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-violet-400" />
                      )}
                      <div className={notification.readAt ? "pl-3.5" : "min-w-0"}>
                        <p className="text-[11.5px] font-medium text-white/70">
                          {notification.title}
                        </p>
                        <p className="mt-0.5 line-clamp-2 text-[10.5px] leading-relaxed text-white/30">
                          {notification.body}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard title="Integrations">
            <IntegrationRow
              icon={Mail}
              label="Email alerts"
              detail={
                emailReady
                  ? "Change emails are delivered through Resend."
                  : "Add RESEND_API_KEY and RESEND_FROM_EMAIL."
              }
              connected={emailReady}
            />
            <IntegrationRow
              icon={BrainCircuit}
              label="AI summaries"
              detail={
                aiReady
                  ? "Summaries are generated from each real diff."
                  : "Add ZAI_API_KEY and ZAI_API_BASE."
              }
              connected={aiReady}
            />
            <IntegrationRow
              icon={CalendarClock}
              label="Scheduled checks"
              detail={
                cronReady
                  ? "An external scheduler can call the cron endpoint."
                  : "Set CRON_SECRET and schedule /api/cron/check hourly."
              }
              connected={cronReady}
            />
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
