"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

type CheckoutResponse = {
  keyId: string;
  subscriptionId: string;
  plan: string;
  amount: number;
  currency: string;
  checkoutName: string;
  checkoutDescription: string;
  prefill: { name: string; email: string };
};

let checkoutScript: Promise<void> | null = null;
function loadCheckout() {
  if (window.Razorpay) return Promise.resolve();
  if (!checkoutScript) {
    checkoutScript = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Could not load Razorpay checkout."));
      document.body.appendChild(script);
    });
  }
  return checkoutScript;
}

export function RazorpayCheckoutButton({ plan, label }: { plan: string; label: string }) {
  const [loading, setLoading] = useState(false);

  async function startCheckout() {
    setLoading(true);
    try {
      const response = await fetch("/api/billing/razorpay/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await response.json() as CheckoutResponse & { error?: string };
      if (!response.ok) throw new Error(data.error || "Could not start checkout.");
      await loadCheckout();
      if (!window.Razorpay) throw new Error("Razorpay checkout is unavailable.");

      const checkout = new window.Razorpay({
        key: data.keyId,
        subscription_id: data.subscriptionId,
        name: data.checkoutName,
        description: data.checkoutDescription,
        prefill: data.prefill,
        theme: { color: "#8b5cf6" },
        handler: async (result: Record<string, string>) => {
          const verified = await fetch("/api/billing/razorpay/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(result),
          });
          const outcome = await verified.json();
          if (!verified.ok) {
            toast.error(outcome.error || "Payment verification failed.");
            return;
          }
          toast.success("Payment response verified. Your plan will update after Razorpay confirms it.");
          window.location.assign("/dashboard/billing?payment=pending");
        },
        modal: { ondismiss: () => toast.info("Checkout closed. No plan change was made.") },
      });
      checkout.open();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Checkout failed.");
    } finally {
      setLoading(false);
    }
  }

  return <Button size="sm" variant="outline" onClick={startCheckout} disabled={loading} className="rounded-lg border-white/10 text-[11.5px]">
    {loading ? "Opening…" : label}
  </Button>;
}
