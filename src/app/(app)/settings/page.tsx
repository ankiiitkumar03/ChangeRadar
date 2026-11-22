import { CheckCircle2, CircleDashed } from "lucide-react";

import { EmailAlertsPreference, PasswordForm, ProfileForm } from "@/components/dashboard/settings-forms";
import { PageHeader, SectionCard } from "@/components/dashboard/ui";
import { isAiConfigured } from "@/lib/ai";
import { isEmailConfigured } from "@/lib/email";
import { formatDate } from "@/lib/format";
import { getPlan } from "@/lib/plans";
import { requireSession } from "@/lib/session";
import { ensureSubscription } from "@/lib/subscriptions";
import { db } from "@/lib/db";
import { userPreferences } from "@/lib/schema";
import { eq } from "drizzle-orm";

export const metadata = { title: "Settings · ChangeRadar" };

export default async function SettingsPage() {
  const session = await requireSession("/settings");
  const subscription = await ensureSubscription(session.user.id);
  const plan = getPlan(subscription.plan);
  await db.insert(userPreferences).values({ userId: session.user.id }).onConflictDoNothing();
  const [preferences] = await db
    .select({ emailAlerts: userPreferences.emailAlerts })
    .from(userPreferences)
    .where(eq(userPreferences.userId, session.user.id))
    .limit(1);

  const integrations = [
    {
      label: "Email alerts",
      ready: isEmailConfigured(),
      detail: "Set RESEND_API_KEY and RESEND_FROM_EMAIL",
    },
    {
      label: "AI change summaries",
      ready: isAiConfigured(),
      detail: "Set ZAI_API_KEY and ZAI_API_BASE",
    },
    {
      label: "Scheduled checks",
      ready: Boolean(process.env.CRON_SECRET),
      detail: "Set CRON_SECRET and call /api/cron/check on a schedule",
    },
    {
      label: "Google sign-in",
      ready: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
      detail: "Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET",
    },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Settings" description="Manage your profile, security and notification preferences." />

      <SectionCard title="Profile">
        <ProfileForm name={session.user.name} email={session.user.email} />
      </SectionCard>

      <SectionCard title="Email preferences" description="Control how ChangeRadar sends change alerts.">
        <EmailAlertsPreference initialEnabled={preferences?.emailAlerts ?? true} />
      </SectionCard>

      <div id="security">
        <SectionCard title="Password" description="Changing your password signs out other devices.">
          <PasswordForm />
        </SectionCard>
      </div>

      <SectionCard title="Account">
        <dl className="divide-y divide-white/[0.05] text-[12.5px]">
          <div className="flex justify-between px-4 py-3">
            <dt className="text-white/35">Plan</dt>
            <dd className="text-white/70">{plan.name}</dd>
          </div>
          <div className="flex justify-between px-4 py-3">
            <dt className="text-white/35">Member since</dt>
            <dd className="text-white/70">{formatDate(session.user.createdAt)}</dd>
          </div>
        </dl>
      </SectionCard>

      <SectionCard title="Platform status" description="Integrations this deployment has configured.">
        <ul className="divide-y divide-white/[0.05]">
          {integrations.map((item) => (
            <li key={item.label} className="flex items-start gap-3 px-4 py-3">
              {item.ready ? (
                <CheckCircle2 className="mt-0.5 size-4 text-emerald-300" />
              ) : (
                <CircleDashed className="mt-0.5 size-4 text-amber-300/70" />
              )}
              <div>
                <p className="text-[12.5px] text-white/75">
                  {item.label} · <span className={item.ready ? "text-emerald-300/80" : "text-amber-300/80"}>{item.ready ? "Connected" : "Not configured"}</span>
                </p>
                {!item.ready && <p className="mt-0.5 text-[11px] text-white/30">{item.detail}</p>}
              </div>
            </li>
          ))}
        </ul>
      </SectionCard>
    </div>
  );
}
