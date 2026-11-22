import { notFound } from "next/navigation";
import { and, count, desc, eq, gte, ilike, isNull, lte, ne, or, sql } from "drizzle-orm";
import { Activity, AlertTriangle, CreditCard, Globe2, Users } from "lucide-react";

import { ActivityChart, type ActivityPoint } from "@/components/dashboard/activity-chart";
import { AdminUserControls } from "@/components/dashboard/admin-user-controls";
import { PageHeader, SectionCard, StatCard } from "@/components/dashboard/ui";
import { db } from "@/lib/db";
import { formatDate, hostnameOf, timeAgo } from "@/lib/format";
import { PLAN_IDS, PLANS, getPlan, isPlanId, type PlanId } from "@/lib/plans";
import { changes, checkRuns, monitors, notifications, paymentWebhookEvents, subscriptions, user } from "@/lib/schema";
import { isAdminUser, requireSession } from "@/lib/session";

export const metadata = { title: "Admin · ChangeRadar" };

type AdminSearchParams = { q?: string; plan?: string; status?: string };

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  const filters = await searchParams;
  const search = (filters.q ?? "").trim().slice(0, 100);
  const planFilter = filters.plan && isPlanId(filters.plan) ? filters.plan : "";
  const allowedStatuses = ["active", "pending", "canceled", "failed", "past_due"];
  const statusFilter = allowedStatuses.includes(filters.status ?? "") ? filters.status! : "";
  const session = await requireSession("/admin");
  if (!(await isAdminUser(session))) notFound();

  const now = Date.now();
  const since24h = new Date(now - 24 * 60 * 60 * 1000);
  const since14d = new Date(now - 13 * 24 * 60 * 60 * 1000);
  since14d.setUTCHours(0, 0, 0, 0);

  const [
    [userTotal],
    [paidTotal],
    [monitorTotal],
    [checks24h],
    [failed24h],
    [changes24h],
    [dueMonitorTotal],
    [pendingEmailTotal],
    [failedEmailTotal],
    [sendingEmailTotal],
    [unprocessedWebhookTotal],
    recentWebhookRows,
    planRows,
    activityRows,
    failedRows,
    userRows,
  ] = await Promise.all([
    db.select({ value: count() }).from(user),
    db
      .select({ value: count() })
      .from(subscriptions)
      .where(and(ne(subscriptions.plan, "free"), eq(subscriptions.status, "active"))),
    db.select({ value: count() }).from(monitors),
    db.select({ value: count() }).from(checkRuns).where(gte(checkRuns.createdAt, since24h)),
    db
      .select({ value: count() })
      .from(checkRuns)
      .where(and(eq(checkRuns.status, "failed"), gte(checkRuns.createdAt, since24h))),
    db.select({ value: count() }).from(changes).where(gte(changes.detectedAt, since24h)),
    db.select({ value: count() }).from(monitors).where(and(eq(monitors.status, "active"), lte(monitors.nextCheckAt, new Date()))),
    db.select({ value: count() }).from(notifications).where(eq(notifications.emailStatus, "pending")),
    db.select({ value: count() }).from(notifications).where(eq(notifications.emailStatus, "failed")),
    db.select({ value: count() }).from(notifications).where(eq(notifications.emailStatus, "sending")),
    db.select({ value: count() }).from(paymentWebhookEvents).where(isNull(paymentWebhookEvents.processedAt)),
    db.select({ id: paymentWebhookEvents.id, eventType: paymentWebhookEvents.eventType, createdAt: paymentWebhookEvents.createdAt, processedAt: paymentWebhookEvents.processedAt })
      .from(paymentWebhookEvents).orderBy(desc(paymentWebhookEvents.createdAt)).limit(8),
    db
      .select({ plan: subscriptions.plan, value: count() })
      .from(subscriptions)
      .groupBy(subscriptions.plan),
    db
      .select({
        day: sql<string>`to_char(${checkRuns.createdAt}, 'YYYY-MM-DD')`,
        checks: sql<number>`count(*)`,
        changes: sql<number>`count(*) filter (where ${checkRuns.status} = 'changed')`,
      })
      .from(checkRuns)
      .where(gte(checkRuns.createdAt, since14d))
      .groupBy(sql`1`)
      .orderBy(sql`1`),
    db
      .select({
        id: checkRuns.id,
        error: checkRuns.error,
        createdAt: checkRuns.createdAt,
        monitorName: monitors.name,
        monitorUrl: monitors.url,
      })
      .from(checkRuns)
      .innerJoin(monitors, eq(checkRuns.monitorId, monitors.id))
      .where(eq(checkRuns.status, "failed"))
      .orderBy(desc(checkRuns.createdAt))
      .limit(8),
    db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        plan: subscriptions.plan,
        subStatus: subscriptions.status,
        provider: subscriptions.provider,
      })
      .from(user)
      .leftJoin(subscriptions, eq(subscriptions.userId, user.id))
      .where(and(
        search ? or(ilike(user.name, `%${search}%`), ilike(user.email, `%${search}%`)) : undefined,
        planFilter ? eq(subscriptions.plan, planFilter) : undefined,
        statusFilter ? eq(subscriptions.status, statusFilter) : undefined,
      ))
      .orderBy(desc(user.createdAt))
      .limit(100),
  ]);

  const monitorCounts = await db
    .select({ userId: monitors.userId, value: count() })
    .from(monitors)
    .groupBy(monitors.userId);
  const monitorsByUser = new Map(monitorCounts.map((row) => [row.userId, Number(row.value)]));

  const byDay = new Map(
    activityRows.map((row) => [row.day, { checks: Number(row.checks), changes: Number(row.changes) }]),
  );
  const activity: ActivityPoint[] = Array.from({ length: 14 }).map((_, index) => {
    const date = new Date(since14d);
    date.setUTCDate(since14d.getUTCDate() + index);
    const key = date.toISOString().slice(0, 10);
    return { day: key, checks: byDay.get(key)?.checks ?? 0, changes: byDay.get(key)?.changes ?? 0 };
  });

  const planCounts = new Map(planRows.map((row) => [row.plan, Number(row.value)]));
  const failedCount = Number(failed24h?.value ?? 0);
  const checkCount = Number(checks24h?.value ?? 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Admin" description="Platform-wide usage, subscriptions and account management." />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Registered users" value={Number(userTotal?.value ?? 0)} icon={Users} tone="violet" />
        <StatCard label="Paid subscriptions" value={Number(paidTotal?.value ?? 0)} icon={CreditCard} tone="cyan" hint="Active, non-free plans" />
        <StatCard label="Monitored websites" value={Number(monitorTotal?.value ?? 0)} icon={Globe2} />
        <StatCard label="Checks (24h)" value={checkCount} icon={Activity} hint={`${Number(changes24h?.value ?? 0)} changes detected`} />
        <StatCard
          label="Failed checks (24h)"
          value={failedCount}
          icon={AlertTriangle}
          tone={failedCount > 0 ? "rose" : "default"}
          hint={checkCount > 0 ? `${Math.round((failedCount / checkCount) * 100)}% failure rate` : "No checks yet"}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_0.9fr]">
        <SectionCard title="Monitoring activity" description="Checks and detected changes, last 14 days">
          <ActivityChart data={activity} />
        </SectionCard>

        <SectionCard title="Plan distribution">
          <ul className="divide-y divide-white/[0.05]">
            {PLAN_IDS.map((id) => (
              <li key={id} className="flex items-center justify-between px-4 py-3 text-[12.5px]">
                <span className="text-white/65">{PLANS[id].name}</span>
                <span className="font-mono text-white/85">{planCounts.get(id) ?? 0}</span>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard title="Operations health" description="Live queue and delivery indicators">
          <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3">
            {[
              { label: "Due monitors", value: Number(dueMonitorTotal?.value ?? 0), tone: "text-amber-200" },
              { label: "Email pending", value: Number(pendingEmailTotal?.value ?? 0), tone: "text-cyan-200" },
              { label: "Email sending", value: Number(sendingEmailTotal?.value ?? 0), tone: "text-violet-200" },
              { label: "Email failed", value: Number(failedEmailTotal?.value ?? 0), tone: "text-rose-200" },
              { label: "Webhook unprocessed", value: Number(unprocessedWebhookTotal?.value ?? 0), tone: "text-amber-200" },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3">
                <p className="text-[10.5px] text-white/35">{item.label}</p>
                <p className={`mt-1 font-mono text-xl ${item.tone}`}>{item.value}</p>
              </div>
            ))}
          </div>
        </SectionCard>
        <SectionCard title="Recent Razorpay webhook events" description="Latest events and processing status">
          {recentWebhookRows.length === 0 ? (
            <p className="px-4 py-8 text-center text-[12px] text-white/30">No webhook events received yet.</p>
          ) : (
            <ul className="divide-y divide-white/[0.05]">
              {recentWebhookRows.map((event) => (
                <li key={event.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-[12px] text-white/75">{event.eventType}</p>
                    <p className="text-[10.5px] text-white/30">{timeAgo(event.createdAt)}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] ${event.processedAt ? "bg-emerald-500/10 text-emerald-200" : "bg-amber-500/10 text-amber-200"}`}>
                    {event.processedAt ? "Processed" : "Pending"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      <SectionCard title="Recent failed checks" description="Websites that couldn’t be fetched">
        {failedRows.length === 0 ? (
          <p className="px-4 py-8 text-center text-[12px] text-white/30">No failed checks recorded.</p>
        ) : (
          <ul className="divide-y divide-white/[0.05]">
            {failedRows.map((row) => (
              <li key={row.id} className="flex items-start justify-between gap-4 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-[12.5px] text-white/75">
                    {row.monitorName} <span className="text-white/30">· {hostnameOf(row.monitorUrl)}</span>
                  </p>
                  <p className="mt-0.5 truncate text-[11px] text-rose-200/60">{row.error ?? "Unknown error"}</p>
                </div>
                <span className="shrink-0 text-[10.5px] text-white/30">{timeAgo(row.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="Users & subscriptions" description={`Showing ${userRows.length} matching accounts (up to 100)`}>
        <form method="get" action="/admin" className="flex flex-col gap-2 border-b border-white/[0.06] p-4 sm:flex-row">
          <input name="q" defaultValue={search} placeholder="Search name or email" className="h-9 min-w-0 flex-1 rounded-lg border border-white/10 bg-white/[0.035] px-3 text-[12px] text-white outline-none placeholder:text-white/25 focus:border-violet-400/50" />
          <select name="plan" defaultValue={planFilter} className="h-9 rounded-lg border border-white/10 bg-[#101321] px-3 text-[12px] text-white/70">
            <option value="">All plans</option>
            {PLAN_IDS.map((id) => <option key={id} value={id}>{PLANS[id].name}</option>)}
          </select>
          <select name="status" defaultValue={statusFilter} className="h-9 rounded-lg border border-white/10 bg-[#101321] px-3 text-[12px] text-white/70">
            <option value="">All statuses</option>
            {allowedStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
          <button type="submit" className="h-9 rounded-lg bg-violet-500 px-4 text-[12px] font-medium text-white hover:bg-violet-400">Filter</button>
          <a href="/admin" className="inline-flex h-9 items-center justify-center rounded-lg border border-white/10 px-3 text-[12px] text-white/55 hover:bg-white/[0.04]">Reset</a>
        </form>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-[12px]">
            <thead>
              <tr className="border-b border-white/[0.06] text-[10.5px] uppercase tracking-[0.1em] text-white/30">
                <th className="px-4 py-2.5 font-medium">User</th>
                <th className="px-4 py-2.5 font-medium">Plan</th>
                <th className="px-4 py-2.5 font-medium">Monitors</th>
                <th className="px-4 py-2.5 font-medium">Joined</th>
                <th className="px-4 py-2.5 text-right font-medium">Manage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {userRows.map((row) => {
                const planId: PlanId = row.plan && isPlanId(row.plan) ? row.plan : "free";
                return (
                  <tr key={row.id}>
                    <td className="px-4 py-2.5">
                      <p className="text-white/80">
                        {row.name}
                        {row.role === "admin" && (
                          <span className="ml-1.5 rounded bg-violet-500/15 px-1 py-0.5 text-[9.5px] text-violet-200">admin</span>
                        )}
                      </p>
                      <p className="text-[11px] text-white/35">{row.email}</p>
                    </td>
                    <td className="px-4 py-2.5 text-white/60">
                      {getPlan(planId).name}
                      {row.subStatus && row.subStatus !== "active" && (
                        <span className="ml-1.5 text-[10.5px] text-amber-300/80">({row.subStatus})</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-white/60">
                      {monitorsByUser.get(row.id) ?? 0} / {getPlan(planId).monitorLimit}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-white/45">{formatDate(row.createdAt)}</td>
                    <td className="px-4 py-2.5">
                      <AdminUserControls
                        userId={row.id}
                        plan={planId}
                        role={row.role ?? "user"}
                        status={row.subStatus ?? "active"}
                        provider={row.provider ?? "none"}
                        isSelf={row.id === session.user.id}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
