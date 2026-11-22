export const PLAN_IDS = ["free", "starter", "pro", "business"] as const;

export type PlanId = (typeof PLAN_IDS)[number];

export type Plan = {
  id: PlanId;
  name: string;
  priceMonthly: number;
  monitorLimit: number;
  description: string;
  features: string[];
  highlights: string[];
  cta: string;
  popular?: boolean;
};

export const PLANS: Record<PlanId, Plan> = {
  free: {
    id: "free",
    name: "Free",
    priceMonthly: 0,
    monitorLimit: 3,
    description: "For trying ChangeRadar on a handful of pages.",
    features: [
      "3 monitored URLs",
      "Checks every 6 hours",
      "Email change alerts",
      "Full change history",
      "Before-and-after comparison",
    ],
    highlights: ["3 monitors", "6-hour checks", "Email alerts"],
    cta: "Start free",
  },
  starter: {
    id: "starter",
    name: "Starter",
    priceMonthly: 9,
    monitorLimit: 10,
    description: "For solo operators watching competitors and key pages.",
    features: [
      "10 monitored URLs",
      "Checks every 6 hours",
      "Email change alerts",
      "AI change summaries",
      "Priority checks",
    ],
    highlights: ["10 monitors", "AI summaries", "Priority checks"],
    cta: "Choose Starter",
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceMonthly: 29,
    monitorLimit: 50,
    description: "For teams that need broad coverage and faster alerts.",
    features: [
      "50 monitored URLs",
      "Hourly or 6-hour checks",
      "AI change summaries",
      "Keyword tracking and exclusions",
      "Email alerts for every change",
    ],
    highlights: ["50 monitors", "Hourly checks", "Keyword filters"],
    cta: "Choose Pro",
    popular: true,
  },
  business: {
    id: "business",
    name: "Business",
    priceMonthly: 79,
    monitorLimit: 200,
    description: "For agencies and teams monitoring many client sites.",
    features: [
      "200 monitored URLs",
      "Hourly or 6-hour checks",
      "AI change summaries",
      "Keyword tracking and exclusions",
      "Dedicated monitoring capacity",
    ],
    highlights: ["200 monitors", "Hourly checks", "Agency ready"],
    cta: "Choose Business",
  },
};

export function isPlanId(value: string): value is PlanId {
  return PLAN_IDS.includes(value as PlanId);
}

export function getPlan(plan: string | null | undefined): Plan {
  if (plan && isPlanId(plan)) return PLANS[plan];
  return PLANS.free;
}

export function formatPrice(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export const FREQUENCY_OPTIONS = [
  { value: "1h", label: "Every hour", minutes: 60 },
  { value: "6h", label: "Every 6 hours", minutes: 360 },
  { value: "12h", label: "Every 12 hours", minutes: 720 },
  { value: "24h", label: "Once a day", minutes: 1440 },
] as const;

export type Frequency = (typeof FREQUENCY_OPTIONS)[number]["value"];

export function isFrequency(value: string): value is Frequency {
  return FREQUENCY_OPTIONS.some((option) => option.value === value);
}

export function frequencyMinutes(frequency: string): number {
  return (
    FREQUENCY_OPTIONS.find((option) => option.value === frequency)?.minutes ?? 360
  );
}

export function frequencyLabel(frequency: string): string {
  return (
    FREQUENCY_OPTIONS.find((option) => option.value === frequency)?.label ??
    "Every 6 hours"
  );
}

export function planAllowsFrequency(plan: PlanId, frequency: string): boolean {
  if (frequency === "1h") return plan === "pro" || plan === "business";
  return true;
}
