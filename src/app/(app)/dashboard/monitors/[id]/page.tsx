import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  BrainCircuit,
  CheckCircle2,
  Clock3,
  GitCompareArrows,
  History,
  Mail,
} from "lucide-react";

import { DiffView } from "@/components/dashboard/diff-view";
import { Favicon } from "@/components/dashboard/favicon";
import { MonitorActions } from "@/components/dashboard/monitor-actions";
import { EmptyState, SectionCard, SetupNotice, StatusBadge } from "@/components/dashboard/ui";
import { isAiConfigured } from "@/lib/ai";
import { db } from "@/lib/db";
import { isEmailConfigured } from "@/lib/email";
import { formatDateTime, hostnameOf, timeAgo } from "@/lib/format";
import { frequencyLabel, getPlan } from "@/lib/plans";
import { changes, checkRuns, snapshots } from "@/lib/schema";
import { findOwnedMonitor } from "@/lib/api";
import { requireSession } from "@/lib/session";
import { ensureSubscription } from "@/lib/subscriptions";
import { cn } from "@/lib/utils";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function MonitorDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ change?: string; version?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  if (!UUID.test(id)) notFound();

  const session = await requireSession(`/dashboard/monitors/${id}`);
  const monitor = await findOwnedMonitor(id, session.user.id);
  if (!monitor) notFound();

  const subscription = await ensureSubscription(session.user.id);
  const plan = getPlan(subscription.plan);

  const [changeRows, versionRows, runRows] = await Promise.all([
    db
      .select()
      .from(changes)
      .where(eq(changes.monitorId, id))
      .orderBy(desc(changes.detectedAt))
      .limit(50),
    db
      .select({ id: snapshots.id, createdAt: snapshots.createdAt, wordCount: snapshots.wordCount })
      .from(snapshots)
      .where(eq(snapshots.monitorId, id))
      .orderBy(desc(snapshots.createdAt))
      .limit(25),
    db
      .select()
      .from(checkRuns)
      .where(eq(checkRuns.monitorId, id))
      .orderBy(desc(checkRuns.createdAt))
      .limit(12),
  ]);

  const selected =
    changeRows.find((change) => change.id === query.change) ?? changeRows[0] ?? null;

  let viewedVersion: { id: string; content: string; createdAt: Date } | null = null;
  if (query.version && UUID.test(query.version)) {
    const [row] = await db
      .select({ id: snapshots.id, content: snapshots.content, createdAt: snapshots.createdAt })
      .from(snapshots)
      .where(and(eq(snapshots.id, query.version), eq(snapshots.monitorId, id)))
      .limit(1);
    viewedVersion = row ?? null;
  }

  const emailMissing = monitor.notifyEmail && !isEmailConfigured();
  const aiMissing = !isAiConfigured();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/monitors"
          className="inline-flex items-center gap-1.5 text-[12px] text-white/40 transition-colors hover:text-white"
        >
          <ArrowLeft className="size-3.5" />
          Back to monitors
        </Link>

        <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-3.5">
            <Favicon url={monitor.url} name={monitor.name} className="size-11 shrink-0" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="truncate text-[24px] font-semibold tracking-[-0.03em] text-white">
                  {monitor.name}
                </h1>
                <StatusBadge status={monitor.status} />
              </div>
              <a
                href={monitor.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex max-w-full items-center gap-1 truncate text-[12.5px] text-white/40 transition-colors hover:text-violet-300"
              >
                <span className="truncate">{monitor.url}</span>
                <ArrowUpRight className="size-3 shrink-0" />
              </a>
            </div>
          </div>

          <MonitorActions
            planId={plan.id}
            monitor={{
              id: monitor.id,
              name: monitor.name,
              status: monitor.status,
              frequency: monitor.frequency,
              keywords: monitor.keywords,
              ignoreKeywords: monitor.ignoreKeywords,
              notifyEmail: monitor.notifyEmail,
            }}
          />
        </div>
      </div>

      {monitor.status === "error" && monitor.lastError && (
        <SetupNotice
          title="The last check failed"
          description={`${monitor.lastError}. ChangeRadar will retry on the next scheduled check.`}
        />
      )}
      {emailMissing && (
        <SetupNotice
          title="Email delivery isn’t configured"
          description="Changes are still saved and shown here, but no email alerts will be sent until a sender is configured."
          env={["RESEND_API_KEY", "RESEND_FROM_EMAIL"]}
        />
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Fact label="Last checked" value={timeAgo(monitor.lastCheckedAt)} detail={formatDateTime(monitor.lastCheckedAt)} />
        <Fact
          label="Next check"
          value={monitor.status === "paused" ? "Paused" : timeAgo(monitor.nextCheckAt).replace(" ago", " (overdue)")}
          detail={monitor.status === "paused" ? "Resume to continue" : formatDateTime(monitor.nextCheckAt)}
        />
        <Fact
          label="Last change"
          value={monitor.lastChangedAt ? timeAgo(monitor.lastChangedAt) : "None yet"}
          detail={formatDateTime(monitor.lastChangedAt)}
        />
        <Fact label="Frequency" value={frequencyLabel(monitor.frequency)} detail={monitor.notifyEmail ? "Email alerts on" : "Email alerts off"} />
      </div>

      {(monitor.keywords.length > 0 || monitor.ignoreKeywords.length > 0) && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[11.5px]">
          {monitor.keywords.length > 0 && <Chips label="Tracking" words={monitor.keywords} tone="violet" />}
          {monitor.ignoreKeywords.length > 0 && <Chips label="Ignoring" words={monitor.ignoreKeywords} tone="muted" />}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.6fr_0.9fr]">
        <div className="min-w-0 space-y-6">
          {selected ? (
            <SectionCard
              title="Before and after"
              description={`Detected ${formatDateTime(selected.detectedAt)}`}
              action={
                <span className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 font-mono text-[10.5px] text-white/45">
                  {selected.changeScore}% of page changed
                </span>
              }
            >
              <div className="space-y-3 border-b border-white/[0.06] p-4">
                {selected.aiSummary ? (
                  <div className="rounded-lg border border-violet-400/15 bg-violet-500/[0.06] p-3">
                    <p className="flex items-center gap-1.5 text-[10.5px] font-medium uppercase tracking-[0.12em] text-violet-300">
                      <BrainCircuit className="size-3" />
                      AI summary
                    </p>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-white/75">{selected.aiSummary}</p>
                  </div>
                ) : (
                  <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] p-3">
                    <p className="text-[10.5px] font-medium uppercase tracking-[0.12em] text-white/35">Summary</p>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-white/65">{selected.summary}</p>
                    {aiMissing && (
                      <p className="mt-2 text-[11px] text-white/30">
                        AI summaries are off. Set <code className="font-mono">ZAI_API_KEY</code> and{" "}
                        <code className="font-mono">ZAI_API_BASE</code> to enable them.
                      </p>
                    )}
                  </div>
                )}
              </div>
              <DiffView segments={selected.diff} />
            </SectionCard>
          ) : (
            <EmptyState
              icon={GitCompareArrows}
              title="No changes detected yet"
              description={
                versionRows.length > 0
                  ? "A baseline has been saved. When this page changes in a meaningful way, the before-and-after comparison will appear here."
                  : "No version of this page has been saved yet. Run a check to record the baseline."
              }
            />
          )}

          {viewedVersion && (
            <SectionCard
              title="Saved version"
              description={`Captured ${formatDateTime(viewedVersion.createdAt)}`}
              action={
                <Link
                  href={`/dashboard/monitors/${id}`}
                  className="text-[11.5px] text-white/40 transition-colors hover:text-white"
                >
                  Close
                </Link>
              }
            >
              <p className="max-h-96 overflow-y-auto whitespace-pre-wrap break-words p-4 text-[12.5px] leading-[1.8] text-white/50">
                {viewedVersion.content.slice(0, 8000)}
                {viewedVersion.content.length > 8000 && "…"}
              </p>
            </SectionCard>
          )}
        </div>

        <div className="min-w-0 space-y-6">
          <SectionCard title="Change timeline" description={`${changeRows.length} detected`}>
            {changeRows.length === 0 ? (
              <p className="px-4 py-6 text-center text-[12px] text-white/30">Nothing has changed yet.</p>
            ) : (
              <ol className="max-h-[420px] divide-y divide-white/[0.05] overflow-y-auto">
                {changeRows.map((change) => {
                  const active = selected?.id === change.id;
                  return (
                    <li key={change.id}>
                      <Link
                        href={`/dashboard/monitors/${id}?change=${change.id}`}
                        scroll={false}
                        className={cn(
                          "block px-4 py-3 transition-colors hover:bg-white/[0.03]",
                          active && "bg-violet-500/[0.06]",
                        )}
                      >
                        <p className="text-[10.5px] text-white/30">{timeAgo(change.detectedAt)}</p>
                        <p className="mt-0.5 line-clamp-2 text-[12px] leading-relaxed text-white/65">
                          {change.aiSummary ?? change.summary}
                        </p>
                      </Link>
                    </li>
                  );
                })}
              </ol>
            )}
          </SectionCard>

          <SectionCard title="Previous versions" description="Saved page snapshots">
            {versionRows.length === 0 ? (
              <p className="px-4 py-6 text-center text-[12px] text-white/30">No versions saved yet.</p>
            ) : (
              <ul className="max-h-72 divide-y divide-white/[0.05] overflow-y-auto">
                {versionRows.map((version, index) => (
                  <li key={version.id}>
                    <Link
                      href={`/dashboard/monitors/${id}?version=${version.id}${selected ? `&change=${selected.id}` : ""}`}
                      scroll={false}
                      className="flex items-center justify-between gap-3 px-4 py-2.5 text-[12px] transition-colors hover:bg-white/[0.03]"
                    >
                      <span className="flex items-center gap-2 text-white/60">
                        <History className="size-3.5 text-white/25" />
                        {formatDateTime(version.createdAt)}
                      </span>
                      <span className="shrink-0 text-[10.5px] text-white/30">
                        {index === 0 ? "Current · " : ""}
                        {version.wordCount.toLocaleString()} words
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard title="Recent checks">
            {runRows.length === 0 ? (
              <p className="px-4 py-6 text-center text-[12px] text-white/30">No checks have run yet.</p>
            ) : (
              <ul className="divide-y divide-white/[0.05]">
                {runRows.map((run) => (
                  <li key={run.id} className="flex items-start justify-between gap-3 px-4 py-2.5">
                    <span className="flex min-w-0 items-start gap-2 text-[12px] text-white/60">
                      {run.status === "failed" ? (
                        <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-rose-300" />
                      ) : run.status === "changed" ? (
                        <GitCompareArrows className="mt-0.5 size-3.5 shrink-0 text-violet-300" />
                      ) : (
                        <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-emerald-300/70" />
                      )}
                      <span className="min-w-0">
                        <span className="capitalize">{run.status}</span>
                        {run.error && <span className="block truncate text-[10.5px] text-rose-200/60">{run.error}</span>}
                      </span>
                    </span>
                    <span className="shrink-0 text-[10.5px] text-white/30">
                      {timeAgo(run.createdAt)}
                      {run.durationMs ? ` · ${(run.durationMs / 1000).toFixed(1)}s` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>
      </div>

      <p className="flex items-center gap-1.5 text-[11px] text-white/25">
        <Clock3 className="size-3" />
        Monitoring {hostnameOf(monitor.url)} since {formatDateTime(monitor.createdAt)}
        {monitor.notifyEmail && (
          <>
            <Mail className="ml-2 size-3" /> Email alerts enabled
          </>
        )}
      </p>
    </div>
  );
}

function Fact({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3.5">
      <p className="text-[11px] font-medium text-white/35">{label}</p>
      <p className="mt-1.5 text-[15px] font-medium tracking-[-0.01em] text-white/85">{value}</p>
      {detail && <p className="mt-0.5 truncate text-[10.5px] text-white/25">{detail}</p>}
    </div>
  );
}

function Chips({ label, words, tone }: { label: string; words: string[]; tone: "violet" | "muted" }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-white/30">{label}</span>
      {words.map((word) => (
        <span
          key={word}
          className={cn(
            "rounded-md border px-1.5 py-0.5 font-mono text-[10.5px]",
            tone === "violet"
              ? "border-violet-400/20 bg-violet-500/10 text-violet-200"
              : "border-white/10 bg-white/[0.03] text-white/45",
          )}
        >
          {word}
        </span>
      ))}
    </div>
  );
}
