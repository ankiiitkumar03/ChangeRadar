import { desc, eq } from "drizzle-orm";
import { Check, CreditCard, Receipt } from "lucide-react";

import { PageHeader, SectionCard, SetupNotice } from "@/components/dashboard/ui";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { db } from "@/lib/db";
import { formatDate, formatMoney } from "@/lib/format";
import { PLAN_IDS, PLANS, formatPrice, getPlan } from "@/lib/plans";
import { billingHistory, monitors } from "@/lib/schema";
import { requireSession } from "@/lib/session";
import { ensureSubscription } from "@/lib/subscriptions";
import { count } from "drizzle-orm";
import { cn } from "@/lib/utils";
import { razorpayPlansConfigured } from "@/lib/razorpay";
import { RazorpayCheckoutButton } from "./razorpay-checkout";

export const metadata = { title: "Billing & plan · ChangeRadar" };

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ limit?: string; payment?: string; cancel?: string }>;
}) {
  const query = await searchParams;
  const session = await requireSession("/dashboard/billing");
  const subscription = await ensureSubscription(session.user.id);
  const plan = getPlan(subscription.plan);

  const [[usage], history] = await Promise.all([
    db.select({ value: count() }).from(monitors).where(eq(monitors.userId, session.user.id)),
    db
      .select()
      .from(billingHistory)
      .where(eq(billingHistory.userId, session.user.id))
      .orderBy(desc(billingHistory.createdAt))
      .limit(24),
  ]);

  const used = Number(usage?.value ?? 0);
  const percent = Math.min(100, Math.round((used / plan.monitorLimit) * 100));
  const paymentsReady = razorpayPlansConfigured();

  return (
    <div className="space-y-6">
      <PageHeader title="Billing & plan" description="Your current plan, monitor usage and billing history." />

      {query.payment === "pending" && (
        <SetupNotice tone="violet" title="Payment response received" description="Razorpay is confirming your subscription. This page will show the paid plan after the signed webhook arrives." />
      )}
      {query.cancel === "scheduled" && (
        <SetupNotice tone="violet" title="Cancellation scheduled" description="Razorpay has accepted your cancellation request. Your current plan remains active until the billing period ends." />
      )}
      {query.cancel === "failed" && (
        <SetupNotice title="Cancellation not confirmed" description="Razorpay did not confirm the cancellation request. Please try again or manage it from your Razorpay dashboard." />
      )}

      {query.limit && (
        <SetupNotice
          tone="violet"
          title="You’ve reached your monitor limit"
          description={`The ${plan.name} plan includes ${plan.monitorLimit} monitors. Delete or pause one, or move to a larger plan.`}
        />
      )}

      {paymentsReady && (
        <SetupNotice tone="violet" title="Razorpay checkout uses INR pricing" description="The amount charged comes from the monthly INR plan configured in your Razorpay Dashboard. The USD amounts shown in this catalogue are not converted automatically; make sure your customer-facing pricing matches your Razorpay plan amounts before going live." />
      )}

      {!paymentsReady && (
        <SetupNotice
          title="Online payments aren’t connected"
          description="Plan upgrades can’t be purchased yet because no payment provider is configured. Until then, plans are assigned by an administrator and no charges are made."
          env={["RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET", "RAZORPAY_WEBHOOK_SECRET", "RAZORPAY_PLAN_STARTER_MONTHLY", "RAZORPAY_PLAN_PRO_MONTHLY", "RAZORPAY_PLAN_BUSINESS_MONTHLY"]}
        />
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <SectionCard title="Current plan">
          <div className="space-y-5 p-4">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[22px] font-semibold tracking-[-0.03em] text-white">{plan.name}</p>
                <p className="mt-0.5 text-[12px] text-white/40">
                  {plan.priceMonthly === 0 ? "Free forever" : `${formatPrice(plan.priceMonthly)} / month`}
                </p>
              </div>
              <span
                className={cn(
                  "rounded-full border px-2 py-0.5 text-[10.5px] font-medium capitalize",
                  subscription.status === "active"
                    ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-300"
                    : "border-amber-400/20 bg-amber-500/10 text-amber-300",
                )}
              >
                {subscription.status}
              </span>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between text-[12px]">
                <span className="text-white/50">Monitors used</span>
                <span className="font-mono text-white/80">
                  {used} / {plan.monitorLimit}
                </span>
              </div>
              <Progress value={percent} className="h-1.5 bg-white/10 [&>div]:bg-violet-400" aria-label="Monitor usage" />
              <p className="mt-2 text-[11px] text-white/30">
                {Math.max(0, plan.monitorLimit - used)} monitors remaining
              </p>
            </div>

            <dl className="space-y-2 border-t border-white/[0.06] pt-4 text-[12px]">
              <div className="flex justify-between">
                <dt className="text-white/35">Current period started</dt>
                <dd className="text-white/60">{formatDate(subscription.currentPeriodStart)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-white/35">Renews / ends</dt>
                <dd className="text-white/60">{subscription.currentPeriodEnd ? formatDate(subscription.currentPeriodEnd) : "—"}</dd>
              </div>
            </dl>

            {subscription.providerSubscriptionId && subscription.status === "active" && !subscription.cancelAtPeriodEnd ? (
              <form action="/api/billing/razorpay/cancel" method="post">
                <Button variant="outline" className="w-full rounded-lg border-white/10 text-[12px]" type="submit">
                  <CreditCard className="size-3.5" /> Cancel at period end
                </Button>
              </form>
            ) : (
              <p className="text-[11px] text-white/35">{subscription.cancelAtPeriodEnd ? "Cancellation is scheduled." : "Manage your paid subscription from this page."}</p>
            )}
          </div>
        </SectionCard>

        <SectionCard title="Plans" description="Monitor limits per plan">
          <ul className="divide-y divide-white/[0.05]">
            {PLAN_IDS.map((id) => {
              const item = PLANS[id];
              const current = item.id === plan.id;
              return (
                <li key={id} className="flex items-center justify-between gap-4 px-4 py-3.5">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-[13px] font-medium text-white/85">
                      {item.name}
                      {item.popular && (
                        <span className="rounded-full bg-violet-500/15 px-1.5 py-0.5 text-[9.5px] font-medium text-violet-200">
                          Popular
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 text-[11.5px] text-white/35">
                      {item.monitorLimit} monitors · {formatPrice(item.priceMonthly)}/mo
                    </p>
                  </div>
                  {current ? (
                    <span className="inline-flex items-center gap-1 text-[11.5px] text-emerald-300">
                      <Check className="size-3.5" /> Current
                    </span>
                  ) : (
                    paymentsReady && item.priceMonthly > 0 && subscription.plan === "free" ? (
                      <RazorpayCheckoutButton plan={id} label={item.priceMonthly > plan.priceMonthly ? "Upgrade" : "Switch"} />
                    ) : (
                      <Button size="sm" variant="outline" disabled className="rounded-lg border-white/10 text-[11.5px]">
                        {item.priceMonthly > plan.priceMonthly ? "Upgrade" : "Switch"}
                      </Button>
                    )
                  )}
                </li>
              );
            })}
          </ul>
        </SectionCard>
      </div>

      {subscription.plan !== "free" && subscription.status === "active" && (
        <p className="text-[11px] text-white/35">To prevent duplicate recurring charges, changing plans is disabled while a paid subscription is active. Cancel at period end first; a new plan can be started after Razorpay confirms cancellation.</p>
      )}

      <SectionCard title="Billing history">
        {history.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-10 text-center">
            <Receipt className="size-5 text-white/20" />
            <p className="mt-3 text-[12.5px] text-white/40">No billing activity yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[12px]">
              <thead>
                <tr className="border-b border-white/[0.06] text-[10.5px] uppercase tracking-[0.1em] text-white/30">
                  <th className="px-4 py-2.5 font-medium">Date</th>
                  <th className="px-4 py-2.5 font-medium">Description</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {history.map((entry) => (
                  <tr key={entry.id}>
                    <td className="whitespace-nowrap px-4 py-2.5 text-white/55">{formatDate(entry.createdAt)}</td>
                    <td className="px-4 py-2.5 text-white/65">{entry.description}</td>
                    <td className="px-4 py-2.5 capitalize text-white/45">{entry.status}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right font-mono text-white/70">
                      {formatMoney(entry.amountCents, entry.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
