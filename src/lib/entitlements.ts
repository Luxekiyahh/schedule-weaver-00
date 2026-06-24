export type PlanTier = "basic" | "pro" | "enterprise";

export type BillingPeriod = "monthly" | "yearly";

export type Feature =
  | "booking"
  | "workflow_automations"
  | "sms_marketing"
  | "no_show_automation";

// Single source of truth for which plan unlocks which feature.
// Mirrors the SQL helper public.workspace_has_feature.
export const PLAN_FEATURES: Record<PlanTier, Feature[]> = {
  basic: ["booking"],
  pro: ["booking", "workflow_automations", "sms_marketing"],
  enterprise: ["booking", "workflow_automations", "sms_marketing", "no_show_automation"],
};

export const PLAN_RANK: Record<PlanTier, number> = {
  basic: 0,
  pro: 1,
  enterprise: 2,
};

export type PlanMeta = {
  tier: PlanTier;
  name: string;
  /** Recurring price lookup keys by billing period. */
  monthlyPriceId: string;
  yearlyPriceId: string;
  monthlyCents: number;
  yearlyCents: number;
  tagline: string;
  features: string[];
};

/** Optional one-time "Done-For-You Design" upsell (not bundled into plans). */
export const DESIGN_FEE_PRICE_ID = "design_fee_onetime";
export const DESIGN_FEE_CENTS = 10000;
export const DESIGN_FEE_NAME = "Done-For-You Design";

export const PLANS: PlanMeta[] = [
  {
    tier: "basic",
    name: "Basic",
    monthlyPriceId: "basic_monthly",
    yearlyPriceId: "basic_yearly",
    monthlyCents: 3000,
    yearlyCents: 30000,
    tagline: "Everything you need to run appointments.",
    features: [
      "Booking site (wizard-generated)",
      "Email appointment confirmations",
      "24-hour appointment reminders",
      "Client management",
      "Deposit collection",
    ],
  },
  {
    tier: "pro",
    name: "Pro",
    monthlyPriceId: "pro_monthly",
    yearlyPriceId: "pro_yearly",
    monthlyCents: 4500,
    yearlyCents: 45000,
    tagline: "Keep clients coming back on autopilot.",
    features: [
      "Everything in Basic",
      "SMS reminders",
      "Post-visit feedback email",
      "Rebook nudge sequence",
      "Review redirect flow",
    ],
  },
  {
    tier: "enterprise",
    name: "Enterprise",
    monthlyPriceId: "enterprise_monthly",
    yearlyPriceId: "enterprise_yearly",
    monthlyCents: 6500,
    yearlyCents: 65000,
    tagline: "Maximize every slot with advanced automation.",
    features: [
      "Everything in Pro",
      "No-show automation",
      "Waitlist management",
      "Birthday & loyalty emails",
      "Priority support with direct access",
    ],
  },
];

export function planByTier(tier: PlanTier): PlanMeta {
  return PLANS.find((p) => p.tier === tier)!;
}

/** Resolve the recurring price lookup key for a tier + billing period. */
export function priceIdFor(tier: PlanTier, period: BillingPeriod): string {
  const plan = planByTier(tier);
  return period === "yearly" ? plan.yearlyPriceId : plan.monthlyPriceId;
}

/** Display price (in cents) for a tier + billing period. */
export function centsFor(tier: PlanTier, period: BillingPeriod): number {
  const plan = planByTier(tier);
  return period === "yearly" ? plan.yearlyCents : plan.monthlyCents;
}

export function planByPriceId(priceId: string): PlanMeta | undefined {
  return PLANS.find((p) => p.monthlyPriceId === priceId || p.yearlyPriceId === priceId);
}

export function tierHasFeature(tier: PlanTier, feature: Feature): boolean {
  return PLAN_FEATURES[tier].includes(feature);
}

/** Lowest tier that includes the given feature. */
export function minTierForFeature(feature: Feature): PlanTier {
  return (["basic", "pro", "enterprise"] as PlanTier[]).find((t) => tierHasFeature(t, feature))!;
}
