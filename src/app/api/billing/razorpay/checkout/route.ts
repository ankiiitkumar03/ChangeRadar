import { NextResponse } from "next/server";
import { z } from "zod";

import { getApiSession } from "@/lib/api";
import { db } from "@/lib/db";
import { getPlan, isPlanId } from "@/lib/plans";
import { getRazorpayKeyId, razorpayConfigured, razorpayRequest } from "@/lib/razorpay";
import { subscriptions } from "@/lib/schema";
import { ensureSubscription } from "@/lib/subscriptions";
import { eq } from "drizzle-orm";

const bodySchema = z.object({ plan: z.string().min(1) });
type RazorpayPlan = { id: string; period: string; item: { amount: number; currency: string; name: string } };
type RazorpaySubscription = { id: string; status: string; plan_id: string; short_url?: string };

const PLAN_ENV: Record<string, string> = {
  starter: "RAZORPAY_PLAN_STARTER_MONTHLY",
  pro: "RAZORPAY_PLAN_PRO_MONTHLY",
  business: "RAZORPAY_PLAN_BUSINESS_MONTHLY",
};

export async function POST(request: Request) {
  const session = await getApiSession(request);
  if (!session) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  if (!razorpayConfigured()) return NextResponse.json({ error: "Razorpay is not fully configured yet." }, { status: 503 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !isPlanId(parsed.data?.plan ?? "") || parsed.data.plan === "free") {
    return NextResponse.json({ error: "Choose a valid paid plan." }, { status: 400 });
  }

  const planId = parsed.data.plan;
  const providerPlanId = process.env[PLAN_ENV[planId]];
  if (!providerPlanId) return NextResponse.json({ error: `Missing ${PLAN_ENV[planId]} configuration.` }, { status: 503 });

  try {
    const current = await ensureSubscription(session.user.id);
    if (current.plan === planId && current.status === "active") {
      return NextResponse.json({ error: "This plan is already active." }, { status: 409 });
    }
    if (current.providerSubscriptionId && (current.status === "active" || current.status === "pending" || current.cancelAtPeriodEnd)) {
      return NextResponse.json({ error: "An existing Razorpay subscription is still active or pending. Cancel or resolve it before starting another plan to avoid duplicate recurring charges." }, { status: 409 });
    }

    // Fetch the dashboard-created plan before creating a subscription. Never accept price or plan IDs from the browser.
    const providerPlan = await razorpayRequest<RazorpayPlan>(`/plans/${encodeURIComponent(providerPlanId)}`);
    if (!providerPlan?.id || providerPlan.id !== providerPlanId || providerPlan.item?.amount <= 0 || providerPlan.item?.currency !== "INR" || providerPlan.period !== "monthly") {
      return NextResponse.json({ error: "The configured Razorpay plan must exist and use a positive INR amount." }, { status: 409 });
    }

    const created = await razorpayRequest<RazorpaySubscription>("/subscriptions", {
      method: "POST",
      body: JSON.stringify({
        plan_id: providerPlanId,
        total_count: 100,
        quantity: 1,
        customer_notify: true,
        notes: { changeradar_user_id: session.user.id, changeradar_plan: planId },
      }),
    });

    await db.update(subscriptions).set({
      provider: "razorpay",
      providerSubscriptionId: created.id,
      pendingPlan: planId,
      status: "pending",
      cancelAtPeriodEnd: false,
      updatedAt: new Date(),
    }).where(eq(subscriptions.userId, session.user.id));

    return NextResponse.json({
      keyId: getRazorpayKeyId(),
      subscriptionId: created.id,
      plan: getPlan(planId).name,
      amount: providerPlan.item.amount,
      currency: providerPlan.item.currency,
      checkoutName: "ChangeRadar",
      checkoutDescription: `${getPlan(planId).name} monthly subscription`,
      prefill: { name: session.user.name ?? "", email: session.user.email ?? "" },
    });
  } catch (error) {
    console.error("Razorpay subscription creation failed", error);
    return NextResponse.json({ error: "Could not start checkout. Please try again." }, { status: 502 });
  }
}
