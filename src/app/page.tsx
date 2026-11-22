import Link from "next/link";
import {
  ArrowRight,
  BellRing,
  BrainCircuit,
  Building2,
  CalendarClock,
  Check,
  Clock3,
  Eye,
  GitCompareArrows,
  Globe2,
  History,
  LineChart,
  Mail,
  Radar,
  ScanSearch,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Target,
  Users,
  Zap,
} from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { RadarVisual } from "@/components/landing/radar-visual";
import { SiteHeader } from "@/components/site-header";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { PLANS, formatPrice } from "@/lib/plans";
import { getSession } from "@/lib/session";

const features = [
  {
    icon: Radar,
    title: "Automated website monitoring",
    description:
      "Add any public URL once. ChangeRadar fetches it on a schedule and keeps every check on record.",
    span: "lg:col-span-2",
    visual: (
      <div className="mt-6 grid grid-cols-3 gap-2">
        {["Pricing", "Careers", "Docs"].map((item, index) => (
          <div
            key={item}
            className="rounded-lg border border-white/[0.07] bg-white/[0.025] p-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-white/50">{item}</span>
              <span
                className={`size-1.5 rounded-full ${
                  index === 1 ? "bg-cyan-300" : "bg-emerald-400/80"
                }`}
              />
            </div>
            <p className="mt-3 font-mono text-[10px] text-white/30">
              {index === 1 ? "changed" : "no change"}
            </p>
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: ScanSearch,
    title: "Intelligent change detection",
    description:
      "Timestamps, rotating banners, and noisy widgets are filtered out. You only hear about text that actually changed.",
    span: "",
  },
  {
    icon: GitCompareArrows,
    title: "Before-and-after comparison",
    description:
      "See exactly what was added, removed, or modified, highlighted side by side with the previous version.",
    span: "",
  },
  {
    icon: Mail,
    title: "Email notifications",
    description:
      "Get a clear email with the change summary and a direct link to the full comparison, as soon as it is detected.",
    span: "",
  },
  {
    icon: BrainCircuit,
    title: "AI change summaries",
    description:
      "A concise explanation of what changed and why it may matter, generated from the actual diff — not guesses.",
    span: "",
  },
  {
    icon: History,
    title: "Complete change history",
    description:
      "Every snapshot and detected change is stored, so you can trace when a price, policy, or headline moved.",
    span: "lg:col-span-2",
  },
  {
    icon: Eye,
    title: "Competitor monitoring",
    description:
      "Track competitor pricing pages, product launches, and messaging changes in one clean workspace.",
    span: "",
  },
];

const steps = [
  {
    icon: Globe2,
    title: "Add a public URL",
    description: "Paste any page you want to watch, name it, and pick a check frequency.",
  },
  {
    icon: CalendarClock,
    title: "ChangeRadar checks it",
    description:
      "We fetch the page every six hours by default, extract its text, and store a clean snapshot.",
  },
  {
    icon: ScanSearch,
    title: "Changes are detected",
    description:
      "The new snapshot is compared with the previous one. Noise is filtered; meaningful differences are kept.",
  },
  {
    icon: BellRing,
    title: "You get notified",
    description:
      "Review the highlighted diff, read the AI summary, and receive an email when it matters.",
  },
];

const useCases = [
  {
    icon: LineChart,
    title: "SaaS teams",
    description: "Watch competitor pricing, positioning, and feature pages.",
  },
  {
    icon: ShoppingBag,
    title: "E-commerce",
    description: "Track product prices, stock status, and promotion copy.",
  },
  {
    icon: Building2,
    title: "Agencies",
    description: "Keep an eye on every client site and policy page in one place.",
  },
  {
    icon: Users,
    title: "Recruiters",
    description: "Spot new roles on career pages the moment they go live.",
  },
  {
    icon: ShieldCheck,
    title: "Compliance teams",
    description: "Follow terms, policies, and regulatory notices closely.",
  },
  {
    icon: Target,
    title: "Researchers",
    description: "Collect a reliable history of public information over time.",
  },
];

const faqs = [
  {
    question: "How often does ChangeRadar check my websites?",
    answer:
      "New monitors are checked every six hours by default. Pro and Business plans can check hourly, and you can choose 6-hour, 12-hour, or daily checks on any plan. You can also run a manual check at any time from a monitor's page.",
  },
  {
    question: "What counts as a meaningful change?",
    answer:
      "ChangeRadar extracts the readable text from the page, normalises timestamps and repeating noise, then compares it with the previous snapshot. A change is recorded when the remaining text differs in a substantive way. Whitespace, dates, and updates to ignored keywords are not treated as changes.",
  },
  {
    question: "Can I monitor pages behind a login?",
    answer:
      "No. ChangeRadar monitors public pages that can be reached without authentication. Pages that require a session, a paywall, or a browser challenge may return an error and will be marked as a failed check so you can see exactly what happened.",
  },
  {
    question: "Do I need a credit card to start?",
    answer:
      "No. The Free plan includes 3 monitored URLs with the full change history and before-and-after comparison. You can upgrade later when you need more coverage.",
  },
  {
    question: "How do email alerts and AI summaries work?",
    answer:
      "When a meaningful change is detected, ChangeRadar creates an in-app notification and sends an email if email delivery is configured for the workspace. AI summaries are generated from the before and after text when an AI provider is connected; otherwise the page shows the exact deterministic diff and a clear setup state.",
  },
  {
    question: "Can I pause or delete a monitor?",
    answer:
      "Yes. Pause monitoring at any time to stop scheduled checks while keeping the history, or delete the monitor to remove it and its snapshots permanently. Both actions are available on the monitor detail page.",
  },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-white/55">
      <span className="size-1.5 rounded-full bg-violet-400" />
      {children}
    </span>
  );
}

export default async function LandingPage() {
  let session = null;
  try {
    session = await getSession();
  } catch {
    // Keep the public landing page available when the database is offline.
  }

  return (
    <div className="min-h-dvh overflow-x-hidden bg-[#080a14] text-white">
      <SiteHeader signedIn={Boolean(session)} />

      <main>
        <section className="relative">
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_60%_55%_at_50%_-10%,oklch(0.63_0.247_293/0.22),transparent_70%)]" />
          <div className="pointer-events-none absolute inset-0 -z-10 grid-lines [mask-image:radial-gradient(ellipse_70%_60%_at_50%_20%,black,transparent)] opacity-60" />

          <div className="mx-auto grid w-full max-w-6xl items-center gap-14 px-4 pb-20 pt-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8 lg:pb-28 lg:pt-24">
            <div className="animate-fade-up">
              <SectionLabel>Website change monitoring</SectionLabel>
              <h1 className="mt-6 max-w-[15ch] text-5xl font-semibold leading-[1.02] tracking-[-0.045em] text-balance sm:text-6xl lg:text-[64px]">
                Never miss a change on the{" "}
                <span className="text-gradient">web.</span>
              </h1>
              <p className="mt-6 max-w-[46ch] text-base leading-relaxed text-white/60 sm:text-lg">
                Monitor any website. Detect important changes. Get instant alerts.
                ChangeRadar watches the pages that matter and shows you exactly
                what moved.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button
                  asChild
                  size="lg"
                  className="h-12 rounded-xl px-6 text-[15px] shadow-[0_0_40px_-8px] shadow-violet-500/70"
                >
                  <Link href={session ? "/dashboard" : "/sign-up"}>
                    {session ? "Open your dashboard" : "Start monitoring free"}
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="h-12 rounded-xl border-white/12 bg-white/[0.02] px-6 text-[15px] text-white/80 hover:bg-white/[0.06] hover:text-white"
                >
                  <Link href="#how-it-works">See how it works</Link>
                </Button>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12.5px] text-white/40">
                <span className="inline-flex items-center gap-1.5">
                  <Check className="size-3.5 text-emerald-400" /> 3 monitors free
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Check className="size-3.5 text-emerald-400" /> No credit card
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Check className="size-3.5 text-emerald-400" /> Checks every 6 hours
                </span>
              </div>
            </div>

            <div className="animate-fade-up [animation-delay:120ms]">
              <RadarVisual />
            </div>
          </div>
        </section>

        <section className="border-y border-white/[0.06] bg-white/[0.012]">
          <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-6 px-4 py-6 sm:px-6">
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-white/35">
              Built for teams who watch the web
            </p>
            <div className="flex flex-wrap items-center gap-x-7 gap-y-3 text-[13px] font-medium text-white/45">
              <span className="inline-flex items-center gap-2"><LineChart className="size-4" /> SaaS</span>
              <span className="inline-flex items-center gap-2"><ShoppingBag className="size-4" /> Commerce</span>
              <span className="inline-flex items-center gap-2"><Building2 className="size-4" /> Agencies</span>
              <span className="inline-flex items-center gap-2"><Users className="size-4" /> Recruiting</span>
              <span className="inline-flex items-center gap-2"><ShieldCheck className="size-4" /> Compliance</span>
            </div>
          </div>
        </section>

        <section id="features" className="scroll-mt-24 py-20 lg:py-28">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
            <div className="max-w-2xl">
              <SectionLabel>Features</SectionLabel>
              <h2 className="mt-5 text-3xl font-semibold tracking-[-0.035em] text-balance sm:text-[42px] sm:leading-[1.08]">
                Signal, not noise.
              </h2>
              <p className="mt-4 text-[15px] leading-relaxed text-white/55">
                Most monitoring tools drown you in diffs. ChangeRadar filters the
                page down to readable text, ignores the churn, and keeps a clean
                record of what actually changed.
              </p>
            </div>

            <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((feature) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={feature.title}
                    className={`group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-gradient-to-b from-white/[0.045] to-white/[0.015] p-6 transition-colors duration-300 hover:border-violet-400/25 ${feature.span}`}
                  >
                    <div className="flex size-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-violet-300 transition-colors group-hover:border-violet-400/30 group-hover:text-violet-200">
                      <Icon className="size-[18px]" />
                    </div>
                    <h3 className="mt-5 text-[15px] font-semibold tracking-tight text-white/90">
                      {feature.title}
                    </h3>
                    <p className="mt-2 max-w-[42ch] text-[13.5px] leading-relaxed text-white/45">
                      {feature.description}
                    </p>
                    {feature.visual}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section
          id="how-it-works"
          className="scroll-mt-24 border-y border-white/[0.06] bg-white/[0.012] py-20 lg:py-28"
        >
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
            <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
              <div>
                <SectionLabel>How it works</SectionLabel>
                <h2 className="mt-5 text-3xl font-semibold tracking-[-0.035em] text-balance sm:text-[42px] sm:leading-[1.08]">
                  From URL to alert in four steps.
                </h2>
                <p className="mt-4 max-w-[38ch] text-[15px] leading-relaxed text-white/55">
                  No scripts, no browser extensions, no manual checking. Add a
                  page and ChangeRadar takes over the watching.
                </p>
                <Button
                  asChild
                  variant="outline"
                  className="mt-7 rounded-lg border-white/12 bg-white/[0.02] text-white/80 hover:bg-white/[0.06] hover:text-white"
                >
                  <Link href={session ? "/dashboard/monitors/new" : "/sign-up"}>
                    Add your first website
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </div>

              <ol className="relative space-y-3">
                <div className="absolute left-[23px] top-8 bottom-8 w-px bg-gradient-to-b from-violet-400/40 via-white/10 to-transparent" />
                {steps.map((step, index) => {
                  const Icon = step.icon;
                  return (
                    <li
                      key={step.title}
                      className="relative flex gap-5 rounded-2xl border border-transparent p-2 transition-colors hover:border-white/[0.07] hover:bg-white/[0.02]"
                    >
                      <div className="relative z-10 flex size-12 shrink-0 flex-col items-center justify-center rounded-xl border border-white/10 bg-[#0d1020] text-violet-300">
                        <Icon className="size-5" />
                        <span className="mt-0.5 font-mono text-[9px] text-white/30">
                          0{index + 1}
                        </span>
                      </div>
                      <div className="pt-1.5">
                        <h3 className="text-[15px] font-semibold tracking-tight text-white/90">
                          {step.title}
                        </h3>
                        <p className="mt-1.5 max-w-[48ch] text-[13.5px] leading-relaxed text-white/45">
                          {step.description}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          </div>
        </section>

        <section className="py-20 lg:py-28">
          <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:gap-16">
            <div>
              <SectionLabel>The comparison</SectionLabel>
              <h2 className="mt-5 text-3xl font-semibold tracking-[-0.035em] text-balance sm:text-[42px] sm:leading-[1.08]">
                See the exact change, not just a notification.
              </h2>
              <p className="mt-4 max-w-[46ch] text-[15px] leading-relaxed text-white/55">
                Every alert opens a side-by-side comparison with additions,
                removals, and modifications highlighted. The AI summary explains
                what happened in plain language; the raw diff is always there when
                you want to verify it.
              </p>

              <div className="mt-7 space-y-4">
                {[
                  {
                    icon: GitCompareArrows,
                    title: "Line-level accuracy",
                    text: "Added and removed passages are marked separately.",
                  },
                  {
                    icon: Sparkles,
                    title: "Honest summaries",
                    text: "AI summaries are generated from the real diff, not invented.",
                  },
                  {
                    icon: History,
                    title: "Full version history",
                    text: "Return to any previous snapshot when you need context.",
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.title} className="flex gap-3.5">
                      <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-violet-300">
                        <Icon className="size-4" />
                      </div>
                      <div>
                        <p className="text-[13.5px] font-medium text-white/85">{item.title}</p>
                        <p className="mt-0.5 text-[12.5px] leading-relaxed text-white/40">{item.text}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-[radial-gradient(circle_at_60%_40%,oklch(0.63_0.247_293/0.18),transparent_65%)] blur-2xl" />
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0b0d18] shadow-2xl">
                <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="flex size-5 items-center justify-center rounded bg-violet-500/15">
                      <Radar className="size-3 text-violet-300" />
                    </span>
                    <span className="text-[12px] font-medium text-white/70">Pricing page</span>
                  </div>
                  <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-2 py-0.5 text-[10px] font-medium text-amber-300">
                    Change detected
                  </span>
                </div>

                <div className="grid grid-cols-2 divide-x divide-white/[0.07]">
                  <div className="p-4">
                    <p className="mb-3 font-mono text-[9px] uppercase tracking-[0.16em] text-white/30">
                      Previous
                    </p>
                    <div className="space-y-2 text-[12px] leading-relaxed text-white/55">
                      <p className="font-medium text-white/70">Pro</p>
                      <p>For teams that need broad coverage.</p>
                      <p>
                        <span className="rounded bg-rose-500/15 px-1 text-rose-300 line-through">
                          $24 / month
                        </span>
                      </p>
                      <p>50 monitored URLs</p>
                      <p>Email alerts</p>
                    </div>
                  </div>
                  <div className="p-4">
                    <p className="mb-3 font-mono text-[9px] uppercase tracking-[0.16em] text-white/30">
                      Current
                    </p>
                    <div className="space-y-2 text-[12px] leading-relaxed text-white/55">
                      <p className="font-medium text-white/70">Pro</p>
                      <p>For teams that need broad coverage.</p>
                      <p>
                        <span className="rounded bg-emerald-500/15 px-1 text-emerald-300">
                          $29 / month
                        </span>
                      </p>
                      <p>50 monitored URLs</p>
                      <p>
                        <span className="rounded bg-emerald-500/15 px-1 text-emerald-300">
                          Hourly checks
                        </span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-white/[0.07] bg-white/[0.02] p-4">
                  <div className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded bg-violet-500/15 text-violet-300">
                      <Sparkles className="size-3" />
                    </span>
                    <p className="text-[11.5px] leading-relaxed text-white/55">
                      The Pro plan price increased from $24 to $29 per month, and
                      hourly checks are now included. This may signal a packaging
                      change worth reviewing.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-white/[0.06] bg-white/[0.012] py-20 lg:py-24">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
            <div className="max-w-2xl">
              <SectionLabel>Who it is for</SectionLabel>
              <h2 className="mt-5 text-3xl font-semibold tracking-[-0.035em] text-balance sm:text-[42px] sm:leading-[1.08]">
                If it changes on a page, you can watch it.
              </h2>
            </div>
            <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {useCases.map((useCase) => {
                const Icon = useCase.icon;
                return (
                  <div
                    key={useCase.title}
                    className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-5 transition-colors hover:border-white/[0.12] hover:bg-white/[0.035]"
                  >
                    <Icon className="size-[18px] text-cyan-300/80" />
                    <h3 className="mt-4 text-[14px] font-semibold text-white/85">
                      {useCase.title}
                    </h3>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-white/40">
                      {useCase.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section id="pricing" className="scroll-mt-24 py-20 lg:py-28">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <div className="flex justify-center">
                <SectionLabel>Pricing</SectionLabel>
              </div>
              <h2 className="mt-5 text-3xl font-semibold tracking-[-0.035em] text-balance sm:text-[42px] sm:leading-[1.08]">
                Simple plans. No surprise overages.
              </h2>
              <p className="mt-4 text-[15px] leading-relaxed text-white/55">
                Start with 3 monitors for free. Upgrade when you need more pages,
                faster checks, or AI summaries.
              </p>
            </div>

            <div className="mt-12 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              {Object.values(PLANS).map((plan) => (
                <div
                  key={plan.id}
                  className={`relative flex flex-col rounded-2xl border p-6 ${
                    plan.popular
                      ? "border-violet-400/40 bg-gradient-to-b from-violet-500/[0.12] to-white/[0.02] shadow-[0_0_60px_-24px_oklch(0.63_0.247_293/0.55)]"
                      : "border-white/[0.08] bg-white/[0.02]"
                  }`}
                >
                  {plan.popular && (
                    <span className="absolute -top-2.5 left-6 rounded-full border border-violet-400/30 bg-[#171129] px-2.5 py-0.5 text-[10px] font-medium text-violet-200">
                      Most popular
                    </span>
                  )}
                  <div className="flex items-baseline justify-between">
                    <h3 className="text-[15px] font-semibold text-white/90">{plan.name}</h3>
                    {plan.id === "free" && (
                      <span className="text-[10px] uppercase tracking-[0.14em] text-emerald-300/80">
                        Free forever
                      </span>
                    )}
                  </div>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="font-mono text-[34px] font-semibold tabular-nums tracking-[-0.04em] text-white">
                      {formatPrice(plan.priceMonthly)}
                    </span>
                    <span className="text-[12px] text-white/35">/ month</span>
                  </div>
                  <p className="mt-2 min-h-[40px] text-[12.5px] leading-relaxed text-white/40">
                    {plan.description}
                  </p>
                  <Button
                    asChild
                    variant={plan.popular ? "default" : "outline"}
                    className={`mt-5 w-full rounded-lg ${
                      plan.popular
                        ? "shadow-[0_0_30px_-10px] shadow-violet-500/70"
                        : "border-white/12 bg-white/[0.02] text-white/80 hover:bg-white/[0.06] hover:text-white"
                    }`}
                  >
                    <Link href={`/sign-up?plan=${plan.id}`}>{plan.cta}</Link>
                  </Button>
                  <ul className="mt-6 space-y-2.5">
                    {plan.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-start gap-2 text-[12.5px] leading-relaxed text-white/55"
                      >
                        <Check className="mt-0.5 size-3.5 shrink-0 text-violet-300/80" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <p className="mt-6 text-center text-[12px] text-white/35">
              Monthly billing. Cancel whenever you stop needing coverage. Prices
              in USD.
            </p>
          </div>
        </section>

        <section
          id="faq"
          className="scroll-mt-24 border-y border-white/[0.06] bg-white/[0.012] py-20 lg:py-24"
        >
          <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
            <div>
              <SectionLabel>FAQ</SectionLabel>
              <h2 className="mt-5 text-3xl font-semibold tracking-[-0.035em] text-balance sm:text-[38px] sm:leading-[1.1]">
                Questions, answered.
              </h2>
              <p className="mt-4 max-w-[36ch] text-[14px] leading-relaxed text-white/45">
                Still unsure about something? The dashboard shows the live setup
                state for every integration, so you always know what is running.
              </p>
            </div>
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, index) => (
                <AccordionItem
                  key={faq.question}
                  value={`item-${index}`}
                  className="border-white/[0.08]"
                >
                  <AccordionTrigger className="py-4 text-left text-[14px] font-medium text-white/80 hover:no-underline">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="pb-4 pr-6 text-[13.5px] leading-relaxed text-white/45">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        <section className="py-20 lg:py-28">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
            <div className="relative overflow-hidden rounded-[2rem] border border-violet-400/20 bg-gradient-to-br from-violet-600/20 via-[#0d1020] to-cyan-500/10 px-6 py-14 text-center sm:px-12 lg:py-20">
              <div className="pointer-events-none absolute inset-0 grid-lines opacity-40" />
              <div className="pointer-events-none absolute left-1/2 top-0 h-64 w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-500/30 blur-3xl" />
              <div className="relative mx-auto max-w-2xl">
                <div className="flex justify-center">
                  <span className="flex size-12 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.06] text-violet-200">
                    <Zap className="size-5" />
                  </span>
                </div>
                <h2 className="mt-6 text-3xl font-semibold tracking-[-0.035em] text-balance sm:text-[42px] sm:leading-[1.08]">
                  Know first. Act sooner.
                </h2>
                <p className="mx-auto mt-4 max-w-[44ch] text-[15px] leading-relaxed text-white/55">
                  Add the pages you care about and let ChangeRadar do the watching.
                  Your first three monitors are free.
                </p>
                <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <Button
                    asChild
                    size="lg"
                    className="h-12 rounded-xl px-6 text-[15px] shadow-[0_0_40px_-8px] shadow-violet-500/70"
                  >
                    <Link href={session ? "/dashboard" : "/sign-up"}>
                      {session ? "Open dashboard" : "Start monitoring free"}
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                  <Button
                    asChild
                    size="lg"
                    variant="ghost"
                    className="h-12 rounded-xl px-5 text-white/60 hover:bg-white/[0.06] hover:text-white"
                  >
                    <Link href="#pricing">Compare plans</Link>
                  </Button>
                </div>
                <p className="mt-5 text-[12px] text-white/35">
                  No credit card. Setup takes about a minute.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/[0.06] bg-[#070912]">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-4 max-w-[30ch] text-[13px] leading-relaxed text-white/40">
              Website change monitoring for people who need to know what moved,
              and why it matters.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-white/40">
              <Clock3 className="size-3" />
              6-hour checks by default
            </div>
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/30">Product</p>
            <ul className="mt-4 space-y-2.5 text-[13px] text-white/50">
              <li><Link href="#features" className="hover:text-white">Features</Link></li>
              <li><Link href="#how-it-works" className="hover:text-white">How it works</Link></li>
              <li><Link href="#pricing" className="hover:text-white">Pricing</Link></li>
              <li><Link href="/sign-up" className="hover:text-white">Start free</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/30">Account</p>
            <ul className="mt-4 space-y-2.5 text-[13px] text-white/50">
              <li><Link href="/sign-in" className="hover:text-white">Sign in</Link></li>
              <li><Link href="/sign-up" className="hover:text-white">Create account</Link></li>
              <li><Link href="/settings" className="hover:text-white">Account settings</Link></li>
              <li><Link href="/dashboard" className="hover:text-white">Dashboard</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/30">Resources</p>
            <ul className="mt-4 space-y-2.5 text-[13px] text-white/50">
              <li><Link href="#faq" className="hover:text-white">FAQ</Link></li>
              <li><Link href="/sign-in" className="hover:text-white">Support</Link></li>
              <li><span className="text-white/30">Status: monitoring online</span></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/[0.06]">
          <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 px-4 py-5 text-[11.5px] text-white/30 sm:flex-row sm:px-6">
            <p>© {new Date().getFullYear()} ChangeRadar. All rights reserved.</p>
            <p className="inline-flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-emerald-400" />
              All systems operational
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
