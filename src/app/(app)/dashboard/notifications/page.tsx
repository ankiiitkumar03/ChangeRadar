import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { Bell, Mail, MailWarning } from "lucide-react";

import { MarkReadButton } from "@/components/dashboard/mark-read-button";
import { EmptyState, PageHeader, SetupNotice } from "@/components/dashboard/ui";
import { db } from "@/lib/db";
import { isEmailConfigured } from "@/lib/email";
import { timeAgo } from "@/lib/format";
import { notifications } from "@/lib/schema";
import { requireSession } from "@/lib/session";
import { cn } from "@/lib/utils";

export const metadata = { title: "Notifications · ChangeRadar" };

const emailLabels: Record<string, { label: string; className: string }> = {
  sent: { label: "Email sent", className: "text-emerald-300/80" },
  pending: { label: "Email queued", className: "text-amber-300/80" },
  sending: { label: "Sending email", className: "text-sky-300/80" },
  failed: { label: "Email failed", className: "text-rose-300/80" },
  not_configured: { label: "Email not configured", className: "text-amber-300/80" },
  disabled: { label: "Email off", className: "text-white/25" },
};

export default async function NotificationsPage() {
  const session = await requireSession("/dashboard/notifications");

  const rows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, session.user.id))
    .orderBy(desc(notifications.createdAt))
    .limit(100);

  const unread = rows.filter((row) => !row.readAt).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description={unread > 0 ? `${unread} unread` : "You’re all caught up."}
        actions={<MarkReadButton disabled={unread === 0} />}
      />

      {!isEmailConfigured() && (
        <SetupNotice
          title="Email alerts aren’t configured"
          description="Alerts are recorded here, but nothing is emailed until a sender is set up."
          env={["RESEND_API_KEY", "RESEND_FROM_EMAIL"]}
        />
      )}

      {rows.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No notifications yet"
          description="When ChangeRadar detects a meaningful change on one of your monitored pages, the alert will appear here."
        />
      ) : (
        <ul className="divide-y divide-white/[0.05] overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.02]">
          {rows.map((row) => {
            const baseEmail = emailLabels[row.emailStatus] ?? emailLabels.disabled;
            const email = row.emailStatus === "failed" && row.emailAttempts >= 4
              ? { ...baseEmail, label: "Email failed · retries exhausted" }
              : row.emailStatus === "failed"
                ? { ...baseEmail, label: "Email failed · retry scheduled" }
                : baseEmail;
            const href = row.monitorId
              ? `/dashboard/monitors/${row.monitorId}${row.changeId ? `?change=${row.changeId}` : ""}`
              : "/dashboard";
            return (
              <li key={row.id}>
                <Link
                  href={href}
                  className={cn(
                    "flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-white/[0.03]",
                    !row.readAt && "bg-violet-500/[0.04]",
                  )}
                >
                  <span
                    className={cn(
                      "mt-1.5 size-2 shrink-0 rounded-full",
                      row.readAt ? "bg-white/10" : "bg-violet-400",
                    )}
                    aria-label={row.readAt ? "Read" : "Unread"}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-white/85">{row.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-[12px] leading-relaxed text-white/45">{row.body}</p>
                    <p className="mt-1.5 flex items-center gap-3 text-[10.5px] text-white/25">
                      <span>{timeAgo(row.createdAt)}</span>
                      <span className={cn("inline-flex items-center gap-1", email.className)} title={row.emailError ?? undefined}>
                        {row.emailStatus === "failed" ? <MailWarning className="size-3" /> : <Mail className="size-3" />}
                        {email.label}
                        {["pending", "sending", "failed"].includes(row.emailStatus) && row.emailAttempts > 0 ? ` · attempt ${row.emailAttempts}/4` : ""}
                      </span>
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
