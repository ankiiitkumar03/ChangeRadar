import { ArrowUpRight, Check, GitCompareArrows, Radar } from "lucide-react";

const blips = [
  { label: "Pricing", x: "69%", y: "23%", delay: "0s", tone: "cyan" },
  { label: "Careers", x: "22%", y: "34%", delay: "1.1s", tone: "violet" },
  { label: "Docs", x: "74%", y: "62%", delay: "2.2s", tone: "violet" },
  { label: "Changelog", x: "35%", y: "76%", delay: "0.6s", tone: "cyan" },
];

export function RadarVisual() {
  return (
    <div className="relative mx-auto w-full max-w-[560px]" aria-hidden="true">
      <div className="absolute inset-0 -z-10 rounded-full bg-[radial-gradient(circle_at_50%_45%,oklch(0.63_0.247_293/0.28),transparent_62%)] blur-2xl" />

      <div className="relative aspect-square overflow-hidden rounded-[2rem] border border-white/10 bg-[#0a0c18]/80 shadow-[0_40px_120px_-40px_oklch(0.63_0.247_293/0.5)]">
        <div className="absolute inset-0 grid-lines opacity-70" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_30%,#080a14_88%)]" />

        <div className="absolute left-1/2 top-1/2 size-[86%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-violet-400/15" />
        <div className="absolute left-1/2 top-1/2 size-[66%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-violet-400/20" />
        <div className="absolute left-1/2 top-1/2 size-[46%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-violet-400/25" />
        <div className="absolute left-1/2 top-1/2 size-[26%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-violet-400/30" />

        <div className="absolute left-1/2 top-1/2 h-px w-[86%] -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-transparent via-violet-400/20 to-transparent" />
        <div className="absolute left-1/2 top-1/2 h-[86%] w-px -translate-x-1/2 -translate-y-1/2 bg-gradient-to-b from-transparent via-violet-400/20 to-transparent" />

        <div className="absolute left-1/2 top-1/2 size-[86%] -translate-x-1/2 -translate-y-1/2">
          <div className="absolute inset-0 animate-radar-sweep rounded-full bg-[conic-gradient(from_0deg,oklch(0.63_0.247_293/0.32),oklch(0.63_0.247_293/0.06)_50deg,transparent_85deg)]" />
        </div>

        <div className="absolute left-1/2 top-1/2 flex size-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-2xl border border-white/15 bg-[#12152a] shadow-[0_0_50px_-8px_oklch(0.63_0.247_293/0.9)]">
          <Radar className="size-7 text-violet-300" />
        </div>

        {blips.map((blip) => (
          <div
            key={blip.label}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: blip.x, top: blip.y }}
          >
            <span className="absolute left-1/2 top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 animate-radar-ping rounded-full bg-cyan-300/60" style={{ animationDelay: blip.delay }} />
            <span
              className={`relative block size-2.5 rounded-full ring-4 ${
                blip.tone === "cyan"
                  ? "bg-cyan-300 ring-cyan-300/15"
                  : "bg-violet-300 ring-violet-300/15"
              }`}
            />
            <span
              className="radar-blip-label absolute left-4 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-md border border-white/10 bg-[#0d1020]/90 px-2 py-1 text-[11px] font-medium text-white/80 backdrop-blur"
              style={{ animationDelay: blip.delay }}
            >
              {blip.label}
            </span>
          </div>
        ))}

        <div className="animate-float-slow absolute -right-2 top-[14%] w-[218px] rounded-xl border border-white/12 bg-[#0d1020]/95 p-3.5 shadow-2xl backdrop-blur md:-right-6">
          <div className="flex items-center gap-2 text-[11px] font-medium text-cyan-300">
            <span className="flex size-5 items-center justify-center rounded-full bg-cyan-400/15">
              <Check className="size-3" />
            </span>
            Meaningful change found
          </div>
          <p className="mt-2 text-[13px] font-medium leading-snug text-white">
            Pricing page updated
          </p>
          <div className="mt-2.5 space-y-1.5 rounded-lg bg-white/[0.04] p-2.5 font-mono text-[10.5px] leading-relaxed">
            <p className="text-rose-300/90">
              <span className="mr-1 text-rose-400/60">−</span>Pro · $24 / mo
            </p>
            <p className="text-emerald-300/90">
              <span className="mr-1 text-emerald-400/60">+</span>Pro · $29 / mo
            </p>
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[10px] text-white/40">
            <span>2 minutes ago</span>
            <span className="inline-flex items-center gap-1 text-violet-300">
              Review <ArrowUpRight className="size-3" />
            </span>
          </div>
        </div>

        <div className="absolute -left-3 bottom-[15%] w-[196px] rounded-xl border border-white/12 bg-[#0d1020]/95 p-3.5 shadow-2xl backdrop-blur md:-left-8">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-white/50">Next sweep</span>
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-300">
              <span className="size-1.5 rounded-full bg-emerald-400" />
              Live
            </span>
          </div>
          <div className="mt-2 flex items-end justify-between">
            <span className="font-mono text-xl font-semibold tabular-nums text-white">
              05:42:18
            </span>
            <GitCompareArrows className="size-4 text-violet-300/70" />
          </div>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-[72%] rounded-full bg-gradient-to-r from-violet-500 to-cyan-400" />
          </div>
        </div>
      </div>
    </div>
  );
}
