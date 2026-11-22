import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getApiSession } from "@/lib/api";
import { db } from "@/lib/db";
import { razorpayRequest } from "@/lib/razorpay";
import { subscriptions } from "@/lib/schema";

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Cross-origin request rejected." }, { status: 403 });
  }
  const session = await getApiSession(request);
  if (!session) return NextResponse.redirect(new URL("/sign-in", request.url), 303);
  const [subscription] = await db.select().from(subscriptions).where(eq(subscriptions.userId, session.user.id)).limit(1);
  if (!subscription?.providerSubscriptionId || subscription.provider !== "razorpay" || subscription.cancelAtPeriodEnd) {
    return NextResponse.redirect(new URL("/dashboard/billing", request.url), 303);
  }
  try {
    await razorpayRequest(`/subscriptions/${encodeURIComponent(subscription.providerSubscriptionId)}/cancel`, {
      method: "POST",
      body: JSON.stringify({ cancel_at_cycle_end: true }),
    });
    await db.update(subscriptions).set({ cancelAtPeriodEnd: true, updatedAt: new Date() }).where(eq(subscriptions.id, subscription.id));
  } catch (error) {
    console.error("Razorpay cancellation request failed", error);
    return NextResponse.redirect(new URL("/dashboard/billing?cancel=failed", request.url), 303);
  }
  return NextResponse.redirect(new URL("/dashboard/billing?cancel=scheduled", request.url), 303);
}
