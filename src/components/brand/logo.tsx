import Link from "next/link";
import Image from "next/image";

import { cn } from "@/lib/utils";

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
      <Image
        src="/brand/changeradar-mark.webp"
        alt=""
        width={530}
        height={340}
        className="h-auto w-8 shrink-0 transition-transform duration-300 group-hover:rotate-2 sm:w-9"
      />
      {!compact && (
        <Image
          src="/brand/changeradar-wordmark.webp"
          alt=""
          width={750}
          height={132}
          className="h-auto w-[110px] shrink-0 sm:w-[132px]"
        />
      )}
    </Link>
  );
}
