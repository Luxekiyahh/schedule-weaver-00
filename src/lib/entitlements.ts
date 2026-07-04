export type PlanTier = "basic" | "pro" | "enterprise";

export type BillingPeriod = "monthly" | "yearly";

export type Feature =
  | "booking"
  | "service_lifecycle_automation"
  | "review_redirect"
  | "client_profiles"
  | "vip_tiering"
  | "no_show_prepay"
  | "waitlist_bidding";

// Single source of truth for which plan unlocks which feature.
// Mirrors the SQL helper public.workspace_has_feature.
export const PLAN_FEATURES: Record<PlanTier, Feature[]> = {
  basic: ["booking"],
  pro: ["booking", "service_lifecycle_automation", "review_redirect", "client_profiles"],
  enterprise: [
    "booking",
    "service_lifecycle_automation",
    "review_redirect",
    "client_profiles",
    "vip_tiering",
    "no_show_prepay",
    "waitlist_bidding",
  ],
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
    name: "Basic — The Foundation",
    monthlyPriceId: "basic_monthly",
    yearlyPriceId: "basic_yearly",
    monthlyCents: 2500,
    yearlyCents: 25000,
    tagline: "The Foundation — everything you need to take bookings.",
    features: [
      "Custom-coded booking site (with the $100 setup add-on)",
      "Standard calendar & deposit collection",
      "Basic SMS & email reminders",
      "Standard client management",
    ],
  },
  {
    tier: "pro",
    name: "Pro — The Retention Engine",
    monthlyPriceId: "pro_monthly",
    yearlyPriceId: "pro_yearly",
    monthlyCents: 4500,
    yearlyCents: 45000,
    tagline: "The Retention Engine — keep clients coming back on autopilot.",
    features: [
      "Everything in Basic",
      "Predictive service-lifecycle automations (rebook nudges & follow-ups)",
      "Review redirect flow (auto-ask happy clients for Google reviews)",
      "Private visual client profiles (maps, charts & progress photos)",
    ],
  },
  {
    tier: "enterprise",
    name: "Enterprise / Studio — The VIP & Protection Tier",
    monthlyPriceId: "enterprise_monthly",
    yearlyPriceId: "enterprise_yearly",
    monthlyCents: 6500,
    yearlyCents: 65000,
    tagline: "The VIP & Protection Tier — protect every slot and reward loyalty.",
    features: [
      "Everything in Pro",
      "Dynamic VIP tiering & hidden calendars (deposit waivers, priority booking)",
      'The "No-Show Burn Book" — auto-enforce 100% prepay for flaky clients',
      "Automated waitlist SMS bidding (fill canceled slots instantly)",
      "No-show automation & loyalty emails",
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
