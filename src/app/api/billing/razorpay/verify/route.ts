import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { getApiSession } from "@/lib/api";
import { db } from "@/lib/db";
import { razorpayRequest, verifyCheckoutSignature } from "@/lib/razorpay";
import { subscriptions } from "@/lib/schema";

const schema = z.object({
  razorpay_subscription_id: z.string().min(1).max(100),
  razorpay_payment_id: z.string().min(1).max(100),
  razorpay_signature: z.string().regex(/^[a-f0-9]{64}$/i),
});
type ProviderSubscription = { id: string; status: string; notes?: Record<string, string>; current_start?: number; current_end?: number; customer_id?: string };

export async function POST(request: Request) {
  const session = await getApiSession(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid checkout response." }, { status: 400 });
  const input = parsed.data;
  if (!verifyCheckoutSignature(input.razorpay_subscription_id, input.razorpay_payment_id, input.razorpay_signature)) {
    return NextResponse.json({ error: "Payment signature could not be verified." }, { status: 400 });
  }

  try {
    const provider = await razorpayRequest<ProviderSubscription>(`/subscriptions/${encodeURIComponent(input.razorpay_subscription_id)}`);
    if (provider.id !== input.razorpay_subscription_id || provider.notes?.changeradar_user_id !== session.user.id) {
      return NextResponse.json({ error: "Subscription does not belong to this account." }, { status: 403 });
    }
    // Do not activate from a browser callback. The signed webhook performs the durable state transition.
    return NextResponse.json({ received: true, status: provider.status, message: "Payment response verified. Your plan will update when Razorpay confirms the subscription." });
  } catch (error) {
    console.error("Razorpay callback verification failed", error);
    return NextResponse.json({ error: "Could not verify subscription status." }, { status: 502 });
  }
}
