import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import {
  badRequest,
  forbidden,
  getApiSession,
  notFound,
  serverError,
  unauthorized,
  zodFields,
} from "@/lib/api";
import { db } from "@/lib/db";
import { isPlanId } from "@/lib/plans";
import { billingHistory, subscriptions, user } from "@/lib/schema";
import { isAdminUser } from "@/lib/session";
import { ensureSubscription } from "@/lib/subscriptions";

const updateUserSchema = z.object({
  plan: z.string().optional(),
  role: z.enum(["user", "admin"]).optional(),
  status: z.enum(["active", "canceled"]).optional(),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getApiSession(request);
  if (!session) return unauthorized();
  if (!(await isAdminUser(session))) return forbidden("Admin access required.");

  const { id } = await context.params;
  const parsed = updateUserSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return badRequest("Check the submitted values.", zodFields(parsed.error));
  }
  if (parsed.data.plan && !isPlanId(parsed.data.plan)) {
    return badRequest("Choose a valid plan.");
  }
  if (parsed.data.role && id === session.user.id) {
    return forbidden("You can't change your own role.");
  }
  if (!parsed.data.plan && !parsed.data.role && !parsed.data.status) {
    return badRequest("Nothing to update.");
  }

  try {
    const [target] = await db.select().from(user).where(eq(user.id, id)).limit(1);
    if (!target) return notFound("User not found.");

    if (parsed.data.plan || parsed.data.status) await ensureSubscription(id);
    const [currentSubscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, id))
      .limit(1);

    const touchesBilling = Boolean(parsed.data.plan || parsed.data.status);
    if (
      touchesBilling && currentSubscription?.provider === "razorpay"
    ) {
      return badRequest(
        "This account has a Razorpay-managed subscription. Change its billing status in Razorpay first; manual overrides are blocked to prevent billing and access from becoming inconsistent.",
      );
    }

    const transactionResult = await db.transaction(async (tx) => {
      if (parsed.data.role === "user" && target.role === "admin") {
        const admins = await tx
          .select({ id: user.id })
          .from(user)
          .where(eq(user.role, "admin"))
          .for("update");
        if (admins.length <= 1) return "last-admin" as const;
      }

      if (parsed.data.role) {
        await tx.update(user).set({ role: parsed.data.role }).where(eq(user.id, id));
      }

      if (parsed.data.plan) {
        await tx
          .update(subscriptions)
          .set({
            plan: parsed.data.plan,
            status: "active",
            provider: "admin",
            providerSubscriptionId: null,
            providerCustomerId: null,
            pendingPlan: null,
            cancelAtPeriodEnd: false,
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            updatedAt: new Date(),
          })
          .where(eq(subscriptions.userId, id));

        await tx.insert(billingHistory).values({
          userId: id,
          plan: parsed.data.plan,
          amountCents: 0,
          currency: "usd",
          status: "manual",
          provider: "admin",
          description: `Plan set to ${parsed.data.plan} by ${session.user.email}`,
        });
      }

      if (parsed.data.status) {
        await tx
          .update(subscriptions)
          .set({ status: parsed.data.status, updatedAt: new Date() })
          .where(eq(subscriptions.userId, id));
      }
      return "ok" as const;
    });

    if (transactionResult === "last-admin") {
      return forbidden("The last administrator cannot be removed.");
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Admin update failed", error);
    return serverError("The account could not be updated.");
  }
}
