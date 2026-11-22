"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-rose-400/15 bg-rose-500/[0.04] px-6 py-16 text-center">
      <AlertTriangle className="size-6 text-rose-300" />
      <h2 className="mt-4 text-[15px] font-medium text-white/85">Something went wrong</h2>
      <p className="mt-1.5 max-w-[44ch] text-[12.5px] leading-relaxed text-white/40">
        This page couldn’t be loaded. If the problem continues, check that your database connection is configured.
      </p>
      <Button onClick={reset} size="sm" className="mt-5 rounded-lg">
        Try again
      </Button>
    </div>
  );
}
