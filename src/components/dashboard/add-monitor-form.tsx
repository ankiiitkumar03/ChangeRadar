"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, BriefcaseBusiness, Check, Globe2, Layers3, Loader2, Lock, Sparkles, Tag, TrendingUp } from "lucide-react";
import { toast } from "sonner";

import { Field, FormAlert, authInputClass } from "@/components/auth/form-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { FREQUENCY_OPTIONS, type PlanId } from "@/lib/plans";

export function AddMonitorForm({
  planId,
  planName,
  remaining,
}: {
  planId: PlanId;
  planName: string;
  remaining: number;
}) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [frequency, setFrequency] = useState("6h");
  const [keywords, setKeywords] = useState("");
  const [ignoreKeywords, setIgnoreKeywords] = useState("");
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [selectedStarter, setSelectedStarter] = useState<string | null>(null);
  const [previewPending, setPreviewPending] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{
    finalUrl: string;
    lineCount: number;
    characterCount: number;
    text: string;
    truncated: boolean;
  } | null>(null);

  function clearPreview() {
    setPreview(null);
    setPreviewError(null);
  }

  const starterTemplates = [
    {
      id: "pricing",
      title: "Competitor pricing",
      description: "Track plan and price updates",
      icon: TrendingUp,
      name: "Competitor pricing",
      keywords: "pricing, plans, monthly, annual, free",
    },
    {
      id: "availability",
      title: "Product availability",
      description: "Catch stock and availability changes",
      icon: Tag,
      name: "Product availability",
      keywords: "in stock, out of stock, sold out, available",
    },
    {
      id: "changelog",
      title: "Product updates",
      description: "Follow releases and new features",
      icon: Layers3,
      name: "Product changelog",
      keywords: "release, version, changelog, new feature",
    },
    {
      id: "careers",
      title: "Career openings",
      description: "Watch for new roles and vacancies",
      icon: BriefcaseBusiness,
      name: "Careers page",
      keywords: "careers, jobs, opening, position, hiring",
    },
  ];

  function applyStarter(template: (typeof starterTemplates)[number]) {
    setSelectedStarter(template.id);
    setName(template.name);
    setKeywords(template.keywords);
  }

  const hourlyAllowed = planId === "pro" || planId === "business";

  function handleUrlBlur() {
    if (name.trim()) return;
    try {
      const parsed = new URL(url.trim());
      setName(parsed.hostname.replace(/^www\./, ""));
    } catch {
      // The URL is validated on submit.
    }
  }

  async function handlePreview() {
    clearPreview();
    try {
      const parsedUrl = new URL(url.trim());
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        setPreviewError('Only http and https URLs can be previewed.');
        return;
      }
    } catch {
      setPreviewError('Enter a complete URL, including https://.');
      return;
    }

    setPreviewPending(true);
    try {
      const response = await fetch('/api/monitors/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: url.trim(),
          keywords: keywords.split(',').map((word) => word.trim()).filter(Boolean),
          ignoreKeywords: ignoreKeywords.split(',').map((word) => word.trim()).filter(Boolean),
        }),
      });
      const data = (await response.json()) as {
        error?: string;
        preview?: {
          finalUrl: string;
          lineCount: number;
          characterCount: number;
          text: string;
          truncated: boolean;
        };
      };

      if (!response.ok || !data.preview) {
        setPreviewError(data.error ?? 'We could not preview this page.');
        return;
      }
      setPreview(data.preview);
    } catch {
      setPreviewError('The preview request failed. Check your connection and try again.');
    } finally {
      setPreviewPending(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const nextErrors: Record<string, string> = {};
    if (!name.trim()) nextErrors.name = "Give this monitor a name";
    try {
      const parsed = new URL(url.trim());
      if (!["http:", "https:"].includes(parsed.protocol)) {
        nextErrors.url = "Only http and https URLs can be monitored";
      }
    } catch {
      nextErrors.url = "Enter a complete URL, including https://";
    }
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setPending(true);
    try {
      const response = await fetch("/api/monitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          url: url.trim(),
          frequency,
          keywords: keywords
            .split(",")
            .map((word) => word.trim())
            .filter(Boolean),
          ignoreKeywords: ignoreKeywords
            .split(",")
            .map((word) => word.trim())
            .filter(Boolean),
          notifyEmail,
        }),
      });

      const data = (await response.json()) as {
        error?: string;
        fields?: Record<string, string[]>;
        monitor?: { id: string };
        check?: { status: string; error?: string };
      };

      if (!response.ok) {
        setError(data.error ?? "We could not add this monitor. Please try again.");
        if (data.fields) {
          setFieldErrors(
            Object.fromEntries(
              Object.entries(data.fields).map(([key, messages]) => [key, messages[0]]),
            ),
          );
        }
        setPending(false);
        return;
      }

      if (data.check?.status === "failed") {
        toast.warning("Monitor added, but the first check failed", {
          description: data.check.error,
        });
      } else if (data.check?.status === "baseline") {
        toast.success("Baseline recorded", {
          description: "We will alert you when this page changes.",
        });
      } else {
        toast.success("Monitor added");
      }

      router.push(`/dashboard/monitors/${data.monitor?.id}`);
      router.refresh();
    } catch {
      setError("The request could not be completed. Check your connection and try again.");
      setPending(false);
    }
  }

  return (
    <div className="mx-auto grid w-full max-w-5xl gap-6 lg:grid-cols-[1.35fr_0.65fr]">
      <div>
        <Link
          href="/dashboard/monitors"
          className="inline-flex items-center gap-1.5 text-[12px] text-white/40 transition-colors hover:text-white"
        >
          <ArrowLeft className="size-3.5" />
          Back to monitors
        </Link>
        <h1 className="mt-4 text-[24px] font-semibold tracking-[-0.03em] text-white">
          Add a website
        </h1>
        <p className="mt-1.5 max-w-[58ch] text-[13px] leading-relaxed text-white/40">
          Enter a public page you want to watch. We will fetch it once now to
          record the first version, then keep checking on your schedule.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5" noValidate>
          {error && <FormAlert>{error}</FormAlert>}

          <div className="rounded-xl border border-violet-400/15 bg-violet-500/[0.045] p-4 sm:p-5">
            <div className="mb-3">
              <p className="text-[12.5px] font-medium text-white/80">Start with a use case</p>
              <p className="mt-1 text-[11px] leading-relaxed text-white/35">
                Choose a starter to prefill the monitor name and useful keywords. You can edit everything.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {starterTemplates.map((template) => {
                const Icon = template.icon;
                const selected = selectedStarter === template.id;
                return (
                  <button
                    key={template.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => applyStarter(template)}
                    className={`flex min-w-0 items-start gap-2.5 rounded-lg border p-3 text-left transition-colors ${
                      selected
                        ? "border-violet-400/35 bg-violet-500/[0.10]"
                        : "border-white/[0.07] bg-black/10 hover:border-white/15 hover:bg-white/[0.035]"
                    }`}
                  >
                    <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-white/[0.06] text-violet-200">
                      <Icon className="size-3.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[11.5px] font-medium text-white/75">{template.title}</span>
                      <span className="mt-0.5 block text-[10px] leading-relaxed text-white/35">{template.description}</span>
                    </span>
                    {selected && <Check className="mt-0.5 size-3.5 shrink-0 text-violet-200" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4 sm:p-5">
            <div className="space-y-4">
              <Field id="url" label="Website URL" error={fieldErrors.url}>
                <div className="relative">
                  <Globe2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/25" />
                  <Input
                    id="url"
                    type="url"
                    value={url}
                    onChange={(event) => { setUrl(event.target.value); clearPreview(); }}
                    onBlur={handleUrlBlur}
                    autoComplete="url"
                    inputMode="url"
                    placeholder="https://example.com/pricing"
                    aria-invalid={Boolean(fieldErrors.url)}
                    className={`${authInputClass} pl-9`}
                  />
                </div>
              </Field>

              <Field
                id="name"
                label="Website name"
                error={fieldErrors.name}
                hint="A short label used across your dashboard and alerts."
              >
                <Input
                  id="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Acme pricing page"
                  aria-invalid={Boolean(fieldErrors.name)}
                  className={authInputClass}
                />
              </Field>

              <Field id="frequency" label="Monitoring frequency" error={fieldErrors.frequency}>
                <Select value={frequency} onValueChange={setFrequency}>
                  <SelectTrigger className="h-11 w-full rounded-lg border-white/12 bg-white/[0.035] text-[14px] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-white/10 bg-[#12141f] text-white">
                    {FREQUENCY_OPTIONS.map((option) => (
                      <SelectItem
                        key={option.value}
                        value={option.value}
                        disabled={option.value === "1h" && !hourlyAllowed}
                      >
                        {option.label}
                        {option.value === "1h" && !hourlyAllowed ? " · Pro" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!hourlyAllowed && (
                  <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-amber-300/70">
                    <Lock className="size-3" />
                    Hourly checks are available on Pro and Business.
                  </p>
                )}
              </Field>
            </div>
          </div>

          <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4 sm:p-5">
            <div className="mb-4">
              <h2 className="text-[13px] font-medium text-white/80">Change filters</h2>
              <p className="mt-0.5 text-[11.5px] leading-relaxed text-white/35">
                Optional. Narrow the comparison to specific words, or mute text
                that changes all the time.
              </p>
            </div>

            <div className="space-y-4">
              <Field
                id="keywords"
                label="Keywords to track"
                hint="Comma separated. When set, only lines containing these words are compared. Starter choices prefill this for you."
              >
                <Input
                  id="keywords"
                  value={keywords}
                  onChange={(event) => { setKeywords(event.target.value); clearPreview(); }}
                  placeholder="pricing, enterprise, sold out"
                  className={authInputClass}
                />
              </Field>

              <Field
                id="ignore"
                label="Keywords to ignore"
                hint="Comma separated. Lines containing these words are removed before comparison."
              >
                <Input
                  id="ignore"
                  value={ignoreKeywords}
                  onChange={(event) => { setIgnoreKeywords(event.target.value); clearPreview(); }}
                  placeholder="cookie policy, live chat, visitors online"
                  className={authInputClass}
                />
              </Field>

              <div className="rounded-lg border border-white/[0.07] bg-black/10 p-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[12px] font-medium text-white/75">Check before saving</p>
                    <p className="mt-0.5 text-[10.5px] leading-relaxed text-white/35">
                      Preview the readable text and current filters without creating a monitor.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handlePreview}
                    disabled={previewPending || pending}
                    className="shrink-0 rounded-lg border-white/12 bg-white/[0.02]"
                  >
                    {previewPending ? <Loader2 className="size-4 animate-spin" /> : <Globe2 className="size-4" />}
                    {previewPending ? "Checking page…" : "Preview page"}
                  </Button>
                </div>
                {previewError && (
                  <p role="alert" className="mt-3 rounded-md border border-rose-400/15 bg-rose-500/[0.06] px-3 py-2 text-[11px] leading-relaxed text-rose-200/80">
                    {previewError}
                  </p>
                )}
                {preview && (
                  <div className="mt-3 rounded-md border border-emerald-400/15 bg-emerald-500/[0.04] p-3">
                    <p className="text-[10.5px] text-emerald-200/80">
                      Found {preview.lineCount} lines and {preview.characterCount.toLocaleString()} characters at {preview.finalUrl}.
                      {preview.truncated ? " Showing the first 1,800 characters." : ""}
                    </p>
                    <pre className="mt-2 max-h-52 overflow-auto whitespace-pre-wrap break-words text-[10.5px] leading-relaxed text-white/55">
                      {preview.text}
                    </pre>
                  </div>
                )}
              </div>
              <div className="flex items-start justify-between gap-4 rounded-lg border border-white/[0.06] bg-black/10 p-3">
                <div>
                  <p className="text-[12.5px] font-medium text-white/75">
                    Email notifications
                  </p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-white/35">
                    Send an alert to your account email when a meaningful change
                    is detected.
                  </p>
                </div>
                <Switch
                  checked={notifyEmail}
                  onCheckedChange={setNotifyEmail}
                  aria-label="Email notifications"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[11px] text-white/30">
              {remaining} monitor{remaining === 1 ? "" : "s"} remaining on {planName}.
            </p>
            <div className="flex gap-2">
              <Button asChild type="button" variant="outline" className="rounded-lg border-white/12 bg-white/[0.02]">
                <Link href="/dashboard/monitors">Cancel</Link>
              </Button>
              <Button type="submit" disabled={pending} className="rounded-lg">
                {pending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Recording baseline…
                  </>
                ) : (
                  <>
                    Add monitor
                    <ArrowRight className="size-4" />
                  </>
                )}
              </Button>
            </div>
          </div>

          {pending && (
            <p className="rounded-lg border border-violet-400/15 bg-violet-500/[0.05] px-3 py-2.5 text-[11.5px] leading-relaxed text-violet-200/70">
              Fetching the page and recording its first snapshot. Large or slow
              pages can take up to 20 seconds.
            </p>
          )}
        </form>
      </div>

      <aside className="space-y-3">
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
          <p className="text-[10px] uppercase tracking-[0.16em] text-white/30">
            What happens next
          </p>
          <ol className="mt-3 space-y-3">
            {[
              "We fetch the page and extract its readable text.",
              "A baseline snapshot is saved to your history.",
              "Checks run on your schedule, every six hours by default.",
              "Meaningful changes become alerts with a full diff.",
            ].map((step, index) => (
              <li key={step} className="flex gap-2.5 text-[11.5px] leading-relaxed text-white/45">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] font-mono text-[9px] text-violet-300">
                  {index + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </div>

        <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
          <div className="flex items-center gap-2 text-[11.5px] font-medium text-white/70">
            <Lock className="size-3.5 text-white/30" />
            Public pages only
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-white/35">
            Pages behind a login, paywall, or bot challenge cannot be fetched.
            Failed checks are recorded with the exact error so nothing looks like
            a real change.
          </p>
        </div>

        <div className="rounded-xl border border-violet-400/15 bg-violet-500/[0.05] p-4">
          <div className="flex items-center gap-2 text-[11.5px] font-medium text-violet-200">
            <Sparkles className="size-3.5" />
            {planName} plan
          </div>
          <p className="mt-1.5 text-[11px] leading-relaxed text-white/35">
            Need more coverage or hourly checks? Compare plans in billing.
          </p>
          <Link
            href="/dashboard/billing"
            className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-violet-300 hover:text-violet-200"
          >
            View plans <ArrowRight className="size-3" />
          </Link>
        </div>
      </aside>
    </div>
  );
}
