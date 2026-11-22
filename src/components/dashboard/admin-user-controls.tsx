"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { PLAN_IDS, PLANS, type PlanId } from "@/lib/plans";

export function AdminUserControls({
  userId,
  plan,
  role,
  status,
  provider,
  isSelf,
}: {
  userId: string;
  plan: PlanId;
  role: string;
  status: string;
  provider: string;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function update(body: Record<string, string>, success: string) {
    setBusy(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        toast.error(data.error ?? "Update failed.");
        return;
      }
      toast.success(success);
      router.refresh();
    } catch {
      toast.error("The request could not be completed.");
    } finally {
      setBusy(false);
    }
  }

  const selectClass =
    "h-8 rounded-md border border-white/10 bg-white/[0.04] px-2 text-[11.5px] text-white/75 outline-none focus-visible:border-violet-400/50 disabled:opacity-50";

  return (
    <div className="flex items-center justify-end gap-2">
      {busy && <Loader2 className="size-3.5 animate-spin text-white/40" />}
      {provider === "razorpay" && (
        <span className="hidden rounded-md border border-cyan-400/15 bg-cyan-400/[0.06] px-2 py-1 text-[9.5px] text-cyan-200/75 xl:inline">
          Razorpay managed
        </span>
      )}
      <select
        aria-label="Plan"
        value={plan}
        disabled={busy || provider === "razorpay"}
        onChange={(event) => update({ plan: event.target.value }, "Plan updated")}
        className={selectClass}
      >
        {PLAN_IDS.map((id) => (
          <option key={id} value={id} className="bg-neutral-900">
            {PLANS[id].name}
          </option>
        ))}
      </select>
      <Button
        size="sm"
        variant="outline"
        disabled={busy || isSelf}
        title={isSelf ? "You can’t change your own role" : undefined}
        onClick={() => update({ role: role === "admin" ? "user" : "admin" }, role === "admin" ? "Admin removed" : "Admin granted")}
        className="h-8 rounded-md border-white/10 px-2 text-[11px]"
      >
        {role === "admin" ? "Remove admin" : "Make admin"}
      </Button>
      <Button
        size="sm"
        variant="outline"
        disabled={busy || provider === "razorpay"}
        title={provider === "razorpay" ? "Manage this subscription in Razorpay to keep billing in sync" : undefined}
        onClick={() => update({ status: status === "active" ? "canceled" : "active" }, status === "active" ? "Subscription canceled" : "Subscription reactivated")}
        className="h-8 rounded-md border-white/10 px-2 text-[11px]"
      >
        {status === "active" ? "Cancel sub" : "Reactivate"}
      </Button>
    </div>
  );
}
