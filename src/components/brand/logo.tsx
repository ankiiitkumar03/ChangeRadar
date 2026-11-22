import Link from "next/link";

import { cn } from "@/lib/utils";

export function RadarMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      aria-hidden="true"
      className={cn("size-9", className)}
      fill="none"
    >
      <defs>
        <linearGradient id="cr-mark" x1="4" y1="4" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#8B5CF6" />
          <stop offset="0.55" stopColor="#6D28D9" />
          <stop offset="1" stopColor="#0EA5E9" />
        </linearGradient>
        <linearGradient id="cr-sweep" x1="20" y1="20" x2="35" y2="9" gradientUnits="userSpaceOnUse">
          <stop stopColor="white" stopOpacity="0.75" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="11" fill="url(#cr-mark)" />
      <rect
        x="0.5"
        y="0.5"
        width="39"
        height="39"
        rx="10.5"
        stroke="white"
        strokeOpacity="0.22"
      />
      <circle cx="20" cy="20" r="13.5" stroke="white" strokeOpacity="0.34" />
      <circle cx="20" cy="20" r="8.5" stroke="white" strokeOpacity="0.28" />
      <circle cx="20" cy="20" r="3.5" stroke="white" strokeOpacity="0.4" />
      <path d="M20 20 L33 13 A14.7 14.7 0 0 0 20 5.3 Z" fill="url(#cr-sweep)" opacity="0.55" />
      <path d="M20 20 L32.5 14.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="27.5" cy="14" r="2" fill="#67E8F9" />
      <circle cx="27.5" cy="14" r="3.6" stroke="#67E8F9" strokeOpacity="0.4" />
      <circle cx="14.5" cy="24.5" r="1.5" fill="white" fillOpacity="0.9" />
      <circle cx="20" cy="20" r="1.2" fill="white" />
    </svg>
  );
}

export function Logo({
  href = "/",
  compact = false,
  className,
}: {
  href?: string;
  compact?: boolean;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex items-center gap-2.5 rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        className,
      )}
      aria-label="ChangeRadar home"
    >
      <RadarMark className="size-8 transition-transform duration-300 group-hover:rotate-6" />
      {!compact && (
        <span className="text-[15px] font-semibold tracking-tight text-foreground">
          Change<span className="text-muted-foreground">Radar</span>
        </span>
      )}
    </Link>
  );
}
