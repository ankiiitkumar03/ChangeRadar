import type { Metadata } from "next";
import { count, eq, isNull, and } from "drizzle-orm";

import { DashboardShell } from "@/components/dashboard/shell";
import { db } from "@/lib/db";
import { getPlan } from "@/lib/plans";
import { monitors, notifications } from "@/lib/schema";
import { isAdminUser, requireSession } from "@/lib/session";
import { ensureSubscription } from "@/lib/subscriptions";

export const metadata: Metadata = {
  robots: { index: false, follow: false, noarchive: true },
};

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession("/dashboard");
  const subscription = await ensureSubscription(session.user.id);
  const plan = getPlan(subscription.plan);

  const [[monitorUsage], [unreadUsage]] = await Promise.all([
    db
      .select({ value: count() })
      .from(monitors)
      .where(eq(monitors.userId, session.user.id)),
    db
      .select({ value: count() })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, session.user.id),
          isNull(notifications.readAt),
        ),
      ),
  ]);

  const admin = await isAdminUser(session);

  return (
    <DashboardShell
      user={{
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
        planName: plan.name,
        isAdmin: admin,
      }}
      monitorCount={Number(monitorUsage?.value ?? 0)}
      monitorLimit={plan.monitorLimit}
      unread={Number(unreadUsage?.value ?? 0)}
    >
      {children}
    </DashboardShell>
  );
}
