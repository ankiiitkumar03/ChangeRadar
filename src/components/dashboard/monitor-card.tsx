import Link from "next/link";
import { ArrowUpRight, Clock3, GitCompareArrows } from "lucide-react";

import { Favicon } from "@/components/dashboard/favicon";
import { StatusBadge } from "@/components/dashboard/ui";
import { Button } from "@/components/ui/button";
import { frequencyLabel } from "@/lib/plans";
import { hostnameOf, timeAgo } from "@/lib/format";
import type { Monitor } from "@/lib/schema";

export function MonitorCard({
  monitor,
  lastChange,
}: {
  monitor: Monitor;
  lastChange?: { summary: string; detectedAt: Date } | null;
}) {
  return (
    <div className="group flex flex-col rounded-xl border border-white/[0.07] bg-gradient-to-b from-white/[0.035] to-white/[0.012] p-4 transition-colors hover:border-white/[0.13]">
      <div className="flex items-start gap-3">
        <Favicon url={monitor.url} name={monitor.name} className="size-9 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <Link
              href={`/dashboard/monitors/${monitor.id}`}
              className="truncate text-[13.5px] font-medium text-white/90 transition-colors hover:text-white"
            >
              {monitor.name}
            </Link>
            <StatusBadge status={monitor.status} />
          </div>
          <p className="mt-0.5 truncate text-[11.5px] text-white/35">
            {hostnameOf(monitor.url)}
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-2 text-[11.5px]">
        <div className="flex items-center justify-between gap-3">
          <span className="text-white/30">Last checked</span>
          <span className="text-white/55">{timeAgo(monitor.lastCheckedAt)}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-white/30">Next check</span>
          <span className="inline-flex items-center gap-1.5 text-white/55">
            <Clock3 className="size-3 text-white/25" />
            {monitor.status === "paused"
              ? "Paused"
              : frequencyLabel(monitor.frequency).replace("Every ", "in ")}
          </span>
        </div>
      </div>

      <div className="mt-3 rounded-lg border border-white/[0.06] bg-black/10 px-2.5 py-2">
        <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.12em] text-white/25">
          <GitCompareArrows className="size-3" />
          Last change
        </p>
        <p className="mt-1 line-clamp-2 text-[11.5px] leading-relaxed text-white/50">
          {lastChange
            ? lastChange.summary
            : monitor.lastError
              ? monitor.lastError
              : "No changes detected yet."}
        </p>
        {lastChange && (
          <p className="mt-1 text-[10px] text-white/25">{timeAgo(lastChange.detectedAt)}</p>
        )}
      </div>

      <Button
        asChild
        variant="outline"
        size="sm"
        className="mt-3 w-full rounded-lg border-white/10 bg-white/[0.02] text-[11.5px] text-white/65 hover:bg-white/[0.06] hover:text-white"
      >
        <Link href={`/dashboard/monitors/${monitor.id}`}>
          View details
          <ArrowUpRight className="size-3.5" />
        </Link>
      </Button>
    </div>
  );
}
