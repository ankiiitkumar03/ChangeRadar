import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { ArrowUpRight, GitCompareArrows } from "lucide-react";

import { Favicon } from "@/components/dashboard/favicon";
import { EmptyState, PageHeader } from "@/components/dashboard/ui";
import { db } from "@/lib/db";
import { formatDateTime, hostnameOf, timeAgo } from "@/lib/format";
import { changes, monitors } from "@/lib/schema";
import { requireSession } from "@/lib/session";

export const metadata = { title: "Changes · ChangeRadar" };

export default async function ChangesPage() {
  const session = await requireSession("/dashboard/changes");

  const rows = await db
    .select({
      id: changes.id,
      monitorId: changes.monitorId,
      summary: changes.summary,
      aiSummary: changes.aiSummary,
      changeScore: changes.changeScore,
      detectedAt: changes.detectedAt,
      monitorName: monitors.name,
      monitorUrl: monitors.url,
    })
    .from(changes)
    .innerJoin(monitors, eq(changes.monitorId, monitors.id))
    .where(eq(changes.userId, session.user.id))
    .orderBy(desc(changes.detectedAt))
    .limit(100);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Changes"
        description="Every meaningful change detected across your monitored websites, newest first."
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={GitCompareArrows}
          title="No changes detected yet"
          description="Once a monitored page changes in a meaningful way, it will show up here with a full before-and-after comparison."
          action={{ href: "/dashboard/monitors", label: "View monitors" }}
        />
      ) : (
        <ul className="divide-y divide-white/[0.05] overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.02]">
          {rows.map((row) => (
            <li key={row.id}>
              <Link
                href={`/dashboard/monitors/${row.monitorId}?change=${row.id}`}
                className="group flex items-start gap-3.5 px-4 py-3.5 transition-colors hover:bg-white/[0.03]"
              >
                <Favicon url={row.monitorUrl} name={row.monitorName} className="mt-0.5 size-8 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="text-[13px] font-medium text-white/85">{row.monitorName}</span>
                    <span className="text-[11px] text-white/30">{hostnameOf(row.monitorUrl)}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-[12.5px] leading-relaxed text-white/50">
                    {row.aiSummary ?? row.summary}
                  </p>
                  <p className="mt-1.5 text-[10.5px] text-white/25" title={formatDateTime(row.detectedAt)}>
                    {timeAgo(row.detectedAt)} · {row.changeScore}% of page changed
                  </p>
                </div>
                <ArrowUpRight className="mt-1 size-4 shrink-0 text-white/20 transition-colors group-hover:text-white/60" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
