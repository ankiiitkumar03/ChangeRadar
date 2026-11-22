import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { verifyWebhookSignature } from "@/lib/razorpay";
import { billingHistory, paymentWebhookEvents, subscriptions } from "@/lib/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RazorpayEvent = {
  event?: string;
  payload?: {
    subscription?: { entity?: { id?: string; status?: string; customer_id?: string; current_start?: number; current_end?: number } };
    payment?: { entity?: { id?: string; amount?: number; currency?: string; status?: string; subscription_id?: string } };
  };
};
const asDate = (value?: number) => typeof value === "number" && value > 0 ? new Date(value * 1000) : undefined;

export async function POST(request: Request) {
  const rawBody = Buffer.from(await request.arrayBuffer());
  const signature = request.headers.get("x-razorpay-signature") ?? "";
  const eventId = request.headers.get("x-razorpay-event-id") ?? "";
  if (!signature || !eventId || !verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid webhook signature or event ID." }, { status: 400 });
  }
  let event: RazorpayEvent;
  try { event = JSON.parse(rawBody.toString("utf8")) as RazorpayEvent; }
  catch { return NextResponse.json({ error: "Invalid JSON." }, { status: 400 }); }
  if (!event.event) return NextResponse.json({ error: "Missing event type." }, { status: 400 });

  try {
    const outcome = await db.transaction(async (tx) => {
      const [inserted] = await tx.insert(paymentWebhookEvents).values({
        provider: "razorpay", eventId, eventType: event.event!, payload: event as object,
      }).onConflictDoNothing().returning({ id: paymentWebhookEvents.id });
      if (!inserted) return "duplicate" as const;

      const sub = event.payload?.subscription?.entity;
      const payment = event.payload?.payment?.entity;
      const subscriptionId = sub?.id ?? payment?.subscription_id;
      if (subscriptionId) {
        const [local] = await tx.select().from(subscriptions)
          .where(and(eq(subscriptions.provider, "razorpay"), eq(subscriptions.providerSubscriptionId, subscriptionId))).limit(1);
        if (local) {
          const now = new Date();
          if (event.event === "subscription.activated" || event.event === "subscription.charged") {
            const nextPlan = local.pendingPlan ?? local.plan;
            await tx.update(subscriptions).set({
              plan: nextPlan, pendingPlan: null, status: "active",
              providerCustomerId: sub?.customer_id ?? local.providerCustomerId,
              currentPeriodStart: asDate(sub?.current_start) ?? local.currentPeriodStart,
              currentPeriodEnd: asDate(sub?.current_end) ?? local.currentPeriodEnd,
              cancelAtPeriodEnd: false, updatedAt: now,
            }).where(eq(subscriptions.id, local.id));
            if (event.event === "subscription.charged" && payment?.id) {
              await tx.insert(billingHistory).values({
                userId: local.userId, plan: nextPlan,
                amountCents: Math.round((payment.amount ?? 0) / 100),
                currency: (payment.currency ?? "INR").toLowerCase(),
                status: payment.status === "captured" ? "paid" : "pending",
                provider: "razorpay", providerPaymentId: payment.id,
                description: `${nextPlan} subscription payment`,
              }).onConflictDoNothing();
            }
          } else if (event.event === "subscription.halted") {
            await tx.update(subscriptions).set({ status: "past_due", updatedAt: now }).where(eq(subscriptions.id, local.id));
          } else if (event.event === "subscription.cancelled" || event.event === "subscription.completed") {
            await tx.update(subscriptions).set({
              plan: "free", pendingPlan: null,
              status: event.event === "subscription.cancelled" ? "cancelled" : "expired",
              cancelAtPeriodEnd: false, updatedAt: now,
            }).where(eq(subscriptions.id, local.id));
          } else if (event.event === "subscription.pending") {
            await tx.update(subscriptions).set({ status: "pending", updatedAt: now }).where(eq(subscriptions.id, local.id));
          }
        }
      }
      await tx.update(paymentWebhookEvents).set({ processedAt: new Date() }).where(eq(paymentWebhookEvents.id, inserted.id));
      return "processed" as const;
    });
    return NextResponse.json({ received: true, duplicate: outcome === "duplicate" });
  } catch (error) {
    console.error("Razorpay webhook processing failed", error);
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
