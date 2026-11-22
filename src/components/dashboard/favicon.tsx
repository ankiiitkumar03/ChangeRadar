"use client";

import { useState } from "react";

import { hostnameOf } from "@/lib/format";
import { cn } from "@/lib/utils";

export function Favicon({
  url,
  name,
  className,
}: {
  url: string;
  name: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const host = hostnameOf(url);

  if (failed) {
    return (
      <span
        aria-hidden="true"
        className={cn(
          "flex items-center justify-center rounded-lg border border-white/10 bg-violet-500/10 text-[11px] font-semibold uppercase text-violet-200",
          className,
        )}
      >
        {name.slice(0, 1) || host.slice(0, 1)}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64`}
      alt=""
      width={32}
      height={32}
      loading="lazy"
      onError={() => setFailed(true)}
      className={cn("rounded-lg border border-white/10 bg-white/[0.04]", className)}
    />
  );
}
