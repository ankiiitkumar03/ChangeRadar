"use client";

import { useMemo, useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";

import { MonitorCard } from "@/components/dashboard/monitor-card";
import { EmptyState } from "@/components/dashboard/ui";
import { Input } from "@/components/ui/input";
import type { Monitor } from "@/lib/schema";

type ChangeSummary = { summary: string; detectedAt: Date };
type Filter = "all" | "active" | "paused" | "error";

const filters: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Monitoring" },
  { value: "paused", label: "Paused" },
  { value: "error", label: "Needs attention" },
];

export function MonitorBrowser({
  monitors,
  latestChanges,
}: {
  monitors: Monitor[];
  latestChanges: Record<string, ChangeSummary>;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const counts = useMemo(
    () => ({
      all: monitors.length,
      active: monitors.filter((monitor) => monitor.status === "active").length,
      paused: monitors.filter((monitor) => monitor.status === "paused").length,
      error: monitors.filter((monitor) => monitor.status === "error").length,
    }),
    [monitors],
  );

  const visible = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return monitors.filter((monitor) => {
      const matchesFilter = filter === "all" || monitor.status === filter;
      const matchesQuery =
        !normalized ||
        monitor.name.toLocaleLowerCase().includes(normalized) ||
        monitor.url.toLocaleLowerCase().includes(normalized);
      return matchesFilter && matchesQuery;
    });
  }, [filter, monitors, query]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/30" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by website name or URL…"
            aria-label="Search monitors by website name or URL"
            className="h-10 border-white/10 bg-black/20 pl-9 pr-9 text-[12px] text-white placeholder:text-white/30"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-white/35 hover:bg-white/10 hover:text-white"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1.5" aria-label="Filter monitors by status">
          <SlidersHorizontal className="mr-1 size-3.5 text-white/30" />
          {filters.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setFilter(item.value)}
              aria-pressed={filter === item.value}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-[11px] transition-colors ${
                filter === item.value
                  ? "border-violet-400/30 bg-violet-500/15 text-violet-200"
                  : "border-white/[0.07] bg-white/[0.02] text-white/45 hover:border-white/15 hover:text-white/75"
              }`}
            >
              {item.label}
              <span className="font-mono text-[10px] opacity-65">{counts[item.value]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between text-[11px] text-white/35">
        <p>
          Showing <span className="font-medium text-white/65">{visible.length}</span> of {monitors.length} monitors
        </p>
        {(query || filter !== "all") && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setFilter("all");
            }}
            className="text-violet-300 transition-colors hover:text-violet-200"
          >
            Clear filters
          </button>
        )}
      </div>

      {visible.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((monitor) => (
            <MonitorCard
              key={monitor.id}
              monitor={monitor}
              lastChange={latestChanges[monitor.id] ?? null}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.012] px-5 py-10 text-center">
          <Search className="mx-auto size-5 text-white/25" />
          <h3 className="mt-3 text-[13px] font-medium text-white/75">No matching monitors</h3>
          <p className="mt-1 text-[11.5px] text-white/35">
            Try another website name, URL, or status filter.
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setFilter("all");
            }}
            className="mt-3 text-[11px] font-medium text-violet-300 hover:text-violet-200"
          >
            Reset search and filters
          </button>
        </div>
      )}
    </div>
  );
}
