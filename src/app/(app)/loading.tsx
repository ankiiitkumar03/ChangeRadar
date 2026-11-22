import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading">
      <div className="space-y-2">
        <Skeleton className="h-7 w-56 bg-white/[0.06]" />
        <Skeleton className="h-4 w-80 max-w-full bg-white/[0.04]" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-[104px] rounded-xl bg-white/[0.04]" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-xl bg-white/[0.04]" />
    </div>
  );
}
