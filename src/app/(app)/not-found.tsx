import Link from "next/link";
import { Radar } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 px-6 py-20 text-center">
      <Radar className="size-6 text-violet-300" />
      <h2 className="mt-4 text-[15px] font-medium text-white/85">Nothing here</h2>
      <p className="mt-1.5 max-w-[40ch] text-[12.5px] text-white/40">
        This page doesn’t exist, or you don’t have access to it.
      </p>
      <Button asChild size="sm" className="mt-5 rounded-lg">
        <Link href="/dashboard">Back to dashboard</Link>
      </Button>
    </div>
  );
}
