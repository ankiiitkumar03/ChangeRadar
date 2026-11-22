"use client";

import { useMemo, useState } from "react";

import { cn } from "@/lib/utils";
import type { DiffSegment } from "@/lib/schema";

type Mode = "inline" | "split";

const CONTEXT_CHARS = 140;

/** Collapse long unchanged runs so the reader sees the edits with a little context. */
function trimContext(segments: DiffSegment[]): DiffSegment[] {
  return segments.map((segment, index) => {
    if (segment.type !== "unchanged" || segment.text.length <= CONTEXT_CHARS * 2 + 20) {
      return segment;
    }
    const first = index === 0;
    const last = index === segments.length - 1;
    const head = first ? "" : segment.text.slice(0, CONTEXT_CHARS);
    const tail = last ? "" : segment.text.slice(-CONTEXT_CHARS);
    return { type: "unchanged", text: `${head} … ${tail}` };
  });
}

export function DiffView({ segments }: { segments: DiffSegment[] }) {
  const [mode, setMode] = useState<Mode>("inline");
  const trimmed = useMemo(() => trimContext(segments), [segments]);

  const before = trimmed.filter((segment) => segment.type !== "added");
  const after = trimmed.filter((segment) => segment.type !== "removed");

  const added = segments.filter((segment) => segment.type === "added").length;
  const removed = segments.filter((segment) => segment.type === "removed").length;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-2.5">
        <div className="flex items-center gap-3 text-[11px] text-white/40">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-sm bg-emerald-400/70" />
            {added} added
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-sm bg-rose-400/70" />
            {removed} removed
          </span>
        </div>
        <div className="inline-flex rounded-lg border border-white/10 bg-white/[0.03] p-0.5" role="tablist" aria-label="Comparison layout">
          {(["inline", "split"] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={mode === value}
              onClick={() => setMode(value)}
              className={cn(
                "rounded-md px-2.5 py-1 text-[11px] font-medium capitalize transition-colors",
                mode === value ? "bg-white/10 text-white" : "text-white/40 hover:text-white/70",
              )}
            >
              {value === "inline" ? "Inline" : "Before / after"}
            </button>
          ))}
        </div>
      </div>

      {mode === "inline" ? (
        <div className="p-4">
          <DiffText segments={trimmed} />
        </div>
      ) : (
        <div className="grid divide-y divide-white/[0.06] md:grid-cols-2 md:divide-x md:divide-y-0">
          <div className="p-4">
            <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.14em] text-white/30">Before</p>
            <DiffText segments={before} />
          </div>
          <div className="p-4">
            <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.14em] text-white/30">After</p>
            <DiffText segments={after} />
          </div>
        </div>
      )}
    </div>
  );
}

function DiffText({ segments }: { segments: DiffSegment[] }) {
  if (segments.length === 0) {
    return <p className="text-[12.5px] text-white/35">No text to show.</p>;
  }
  return (
    <p className="whitespace-pre-wrap break-words text-[13px] leading-[1.85] text-white/55">
      {segments.map((segment, index) => {
        if (segment.type === "added") {
          return (
            <ins
              key={index}
              className="rounded bg-emerald-500/15 px-0.5 text-emerald-200 no-underline decoration-transparent"
            >
              {segment.text}
            </ins>
          );
        }
        if (segment.type === "removed") {
          return (
            <del
              key={index}
              className="rounded bg-rose-500/15 px-0.5 text-rose-200/90 line-through decoration-rose-300/40"
            >
              {segment.text}
            </del>
          );
        }
        return <span key={index}>{segment.text}</span>;
      })}
    </p>
  );
}
