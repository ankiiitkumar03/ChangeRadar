import Link from "next/link";
import { ArrowLeft, BellRing, GitCompareArrows, Radar } from "lucide-react";

import { Logo } from "@/components/brand/logo";

const points = [
  { icon: Radar, label: "Automated checks every 6 hours" },
  { icon: GitCompareArrows, label: "Clear before-and-after diffs" },
  { icon: BellRing, label: "Email alerts for real changes" },
];

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="grid min-h-dvh bg-[#080a14] text-white lg:grid-cols-[1fr_1.02fr]">
      <div className="flex flex-col px-4 py-8 sm:px-8 lg:px-12">
        <div className="flex items-center justify-between">
          <Logo />
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[12.5px] text-white/45 transition-colors hover:text-white"
          >
            <ArrowLeft className="size-3.5" />
            Back to site
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-[400px]">
            <h1 className="text-[28px] font-semibold tracking-[-0.035em] text-balance">
              {title}
            </h1>
            <p className="mt-2 text-[14px] leading-relaxed text-white/45">{subtitle}</p>
            <div className="mt-7">{children}</div>
            {footer && <div className="mt-6">{footer}</div>}
          </div>
        </div>

        <p className="text-center text-[11.5px] text-white/25">
          By continuing you agree to use ChangeRadar responsibly and only monitor
          public pages.
        </p>
      </div>

      <div className="relative hidden overflow-hidden border-l border-white/[0.06] bg-[#0a0c17] lg:block">
        <div className="absolute inset-0 grid-lines opacity-60" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_65%_35%,oklch(0.63_0.247_293/0.22),transparent_60%)]" />
        <div className="relative flex h-full flex-col justify-center px-14 xl:px-20">
          <div className="relative mx-auto w-full max-w-[420px]">
            <div className="relative aspect-square max-w-[320px]">
              <div className="absolute inset-0 rounded-full border border-violet-400/15" />
              <div className="absolute inset-[14%] rounded-full border border-violet-400/20" />
              <div className="absolute inset-[28%] rounded-full border border-violet-400/25" />
              <div className="absolute inset-[42%] rounded-full border border-violet-400/30" />
              <div className="absolute inset-0 animate-radar-sweep rounded-full bg-[conic-gradient(from_0deg,oklch(0.63_0.247_293/0.3),transparent_75deg)]" />
              <div className="absolute left-1/2 top-1/2 flex size-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-2xl border border-white/15 bg-[#12152a] shadow-[0_0_50px_-8px_oklch(0.63_0.247_293/0.9)]">
                <Radar className="size-6 text-violet-300" />
              </div>
              <span className="absolute left-[68%] top-[24%] size-2.5 rounded-full bg-cyan-300 ring-4 ring-cyan-300/15" />
              <span className="absolute left-[28%] top-[62%] size-2.5 rounded-full bg-violet-300 ring-4 ring-violet-300/15" />
              <span className="absolute left-[54%] top-[76%] size-2 rounded-full bg-cyan-300/80 ring-4 ring-cyan-300/10" />
            </div>

            <h2 className="mt-10 text-[34px] font-semibold leading-[1.08] tracking-[-0.04em] text-balance">
              Watch the web.
              <br />
              <span className="text-gradient">Catch what moves.</span>
            </h2>
            <p className="mt-4 max-w-[38ch] text-[14px] leading-relaxed text-white/45">
              One workspace for competitor pricing, policy updates, product
              launches, and every page you need to keep an eye on.
            </p>

            <ul className="mt-8 space-y-3">
              {points.map((point) => {
                const Icon = point.icon;
                return (
                  <li key={point.label} className="flex items-center gap-3 text-[13px] text-white/55">
                    <span className="flex size-7 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-violet-300">
                      <Icon className="size-3.5" />
                    </span>
                    {point.label}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
