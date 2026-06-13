export type PlanTier = "basic" | "pro" | "enterprise";

export type Feature = "booking" | "workflow_automations" | "sms_marketing" | "ai_agents";

// Single source of truth for which plan unlocks which feature.
// Mirrors the SQL helper public.workspace_has_feature.
export const PLAN_FEATURES: Record<PlanTier, Feature[]> = {
  basic: ["booking"],
  pro: ["booking", "workflow_automations", "sms_marketing"],
  enterprise: ["booking", "workflow_automations", "sms_marketing", "ai_agents"],
};

export const PLAN_RANK: Record<PlanTier, number> = {
  basic: 0,
  pro: 1,
  enterprise: 2,
};

export type PlanMeta = {
  tier: PlanTier;
  name: string;
  priceId: string;
  monthlyCents: number;
  tagline: string;
  features: string[];
};

export const SETUP_FEE_PRICE_ID = "setup_fee_onetime";
export const SETUP_FEE_CENTS = 10000;

export const PLANS: PlanMeta[] = [
  {
    tier: "basic",
    name: "Basic",
    priceId: "basic_monthly",
    monthlyCents: 3000,
    tagline: "Everything you need to take bookings.",
    features: [
      "Custom-branded booking website",
      "Email & text appointment confirmations",
      "Calendar & availability management",
    ],
  },
  {
    tier: "pro",
    name: "Pro",
    priceId: "pro_monthly",
    monthlyCents: 4500,
    tagline: "Automate follow-ups and keep clients coming back.",
    features: [
      "Everything in Basic",
      "Workflow automations (feedback & rebook reminders)",
      "SMS marketing",
    ],
  },
  {
    tier: "enterprise",
    name: "Enterprise",
    priceId: "enterprise_monthly",
    monthlyCents: 6000,
    tagline: "Add AI agents that work the phones for you.",
    features: [
      "Everything in Pro",
      "AI voice agents for calls",
      "AI SMS agents",
    ],
  },
];

export function planByTier(tier: PlanTier): PlanMeta {
  return PLANS.find((p) => p.tier === tier)!;
}

export function planByPriceId(priceId: string): PlanMeta | undefined {
  return PLANS.find((p) => p.priceId === priceId);
}

export function tierHasFeature(tier: PlanTier, feature: Feature): boolean {
  return PLAN_FEATURES[tier].includes(feature);
}

/** Lowest tier that includes the given feature. */
export function minTierForFeature(feature: Feature): PlanTier {
  return (["basic", "pro", "enterprise"] as PlanTier[]).find((t) => tierHasFeature(t, feature))!;
}
