import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { AlertTriangle, ArrowRight, CheckCircle2, PauseCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-[24px] font-semibold tracking-[-0.03em] text-white">
          {title}
        </h1>
        {description && (
          <p className="mt-1.5 max-w-[60ch] text-[13px] leading-relaxed text-white/40">
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon: LucideIcon;
  tone?: "default" | "violet" | "cyan" | "amber" | "rose";
}) {
  const tones = {
    default: "text-white/45 border-white/10 bg-white/[0.03]",
    violet: "text-violet-300 border-violet-400/20 bg-violet-500/10",
    cyan: "text-cyan-300 border-cyan-400/20 bg-cyan-500/10",
    amber: "text-amber-300 border-amber-400/20 bg-amber-500/10",
    rose: "text-rose-300 border-rose-400/20 bg-rose-500/10",
  };

  return (
    <div className="rounded-xl border border-white/[0.07] bg-gradient-to-b from-white/[0.04] to-white/[0.015] p-4">
      <div className="flex items-start justify-between">
        <p className="text-[11.5px] font-medium text-white/40">{label}</p>
        <span className={cn("flex size-7 items-center justify-center rounded-lg border", tones[tone])}>
          <Icon className="size-3.5" />
        </span>
      </div>
      <p className="mt-3 font-mono text-[27px] font-semibold leading-none tabular-nums tracking-[-0.03em] text-white">
        {value}
      </p>
      {hint && <p className="mt-2 text-[11px] text-white/30">{hint}</p>}
    </div>
  );
}

export function StatusBadge({
  status,
}: {
  status: string;
}) {
  const config: Record<string, { label: string; className: string; icon?: LucideIcon }> = {
    active: {
      label: "Monitoring",
      className: "border-emerald-400/20 bg-emerald-500/10 text-emerald-300",
      icon: CheckCircle2,
    },
    paused: {
      label: "Paused",
      className: "border-amber-400/20 bg-amber-500/10 text-amber-300",
      icon: PauseCircle,
    },
    error: {
      label: "Check failed",
      className: "border-rose-400/20 bg-rose-500/10 text-rose-300",
      icon: AlertTriangle,
    },
  };
  const item = config[status] ?? config.paused;
  const Icon = item.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10.5px] font-medium",
        item.className,
      )}
    >
      {Icon ? <Icon className="size-3" /> : <span className="size-1.5 rounded-full bg-current" />}
      {item.label}
    </span>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/[0.1] bg-white/[0.012] px-6 py-14 text-center">
      <div className="flex size-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-violet-300">
        <Icon className="size-5" />
      </div>
      <h3 className="mt-4 text-[14px] font-medium text-white/85">{title}</h3>
      <p className="mt-1.5 max-w-[42ch] text-[12.5px] leading-relaxed text-white/35">
        {description}
      </p>
      {action && (
        <Button asChild size="sm" className="mt-5 rounded-lg">
          <Link href={action.href}>
            {action.label}
            <ArrowRight className="size-3.5" />
          </Link>
        </Button>
      )}
    </div>
  );
}

export function SetupNotice({
  title,
  description,
  env,
  tone = "amber",
}: {
  title: string;
  description: string;
  env?: string[];
  tone?: "amber" | "violet";
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-3.5",
        tone === "amber"
          ? "border-amber-400/15 bg-amber-500/[0.05]"
          : "border-violet-400/15 bg-violet-500/[0.05]",
      )}
    >
      <div className="flex items-start gap-2.5">
        <span
          className={cn(
            "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md",
            tone === "amber"
              ? "bg-amber-400/10 text-amber-300"
              : "bg-violet-400/10 text-violet-300",
          )}
        >
          <AlertTriangle className="size-3.5" />
        </span>
        <div className="min-w-0">
          <p className="text-[12px] font-medium text-white/80">{title}</p>
          <p className="mt-1 text-[11.5px] leading-relaxed text-white/40">{description}</p>
          {env && env.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {env.map((name) => (
                <code
                  key={name}
                  className="rounded border border-white/10 bg-black/30 px-1.5 py-0.5 font-mono text-[10px] text-white/50"
                >
                  {name}
                </code>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function SectionCard({
  title,
  description,
  action,
  children,
  className,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-xl border border-white/[0.07] bg-white/[0.02]", className)}>
      {(title || action) && (
        <div className="flex items-start justify-between gap-3 border-b border-white/[0.06] px-4 py-3.5">
          <div>
            {title && <h2 className="text-[13px] font-medium text-white/85">{title}</h2>}
            {description && (
              <p className="mt-0.5 text-[11.5px] text-white/35">{description}</p>
            )}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
