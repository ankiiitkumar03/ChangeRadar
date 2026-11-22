import "server-only";

import { eq } from "drizzle-orm";

import { db } from "./db";
import { subscriptions, type Subscription } from "./schema";

export async function ensureSubscription(userId: string): Promise<Subscription> {
  const [existing] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);

  if (existing) return existing;

  const [created] = await db
    .insert(subscriptions)
    .values({ userId, plan: "free", status: "active" })
    .onConflictDoNothing()
    .returning();

  if (created) return created;

  const [raced] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);

  return raced;
}
