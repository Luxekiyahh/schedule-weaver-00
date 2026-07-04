import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getStripeEnvironment } from "@/lib/stripe";
import { PLAN_FEATURES, type Feature, type PlanTier } from "@/lib/entitlements";

export type SubscriptionState = {
  loading: boolean;
  workspaceId: string | null;
  /** True only when the workspace has a paid, current subscription. */
  isActive: boolean;
  tier: PlanTier | null;
  status: string | null;
  setupFeePaid: boolean;
  currentPeriodEnd: string | null;
  /** Whether the current plan unlocks a given feature. */
  can: (feature: Feature) => boolean;
  refresh: () => void;
};

const ACTIVE_STATUSES = ["trialing", "active", "past_due"];

export function useSubscription(): SubscriptionState {
  const [loading, setLoading] = useState(true);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [tier, setTier] = useState<PlanTier | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [setupFeePaid, setSetupFeePaid] = useState(false);
  const [currentPeriodEnd, setCurrentPeriodEnd] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) {
        if (!cancelled) setLoading(false);
        return;
      }
      const { data: mem } = await supabase
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", u.user.id)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();
      if (!mem) {
        if (!cancelled) setLoading(false);
        return;
      }
      const wsId = mem.workspace_id as string;
      const env = getStripeEnvironment();
      const columns = "plan_tier, status, setup_fee_paid, current_period_end";
      let { data: sub } = await supabase
        .from("subscriptions")
        .select(columns)
        .eq("workspace_id", wsId)
        .eq("environment", env)
        .maybeSingle();

      // Preview/dev runs in the sandbox environment, but real subscribers only
      // ever have a "live" row (checkout targets live). Without a fallback they
      // read as inactive in preview and get bounced to /pricing. Fall back to
      // the live row for gating in sandbox only — never the reverse, so the
      // published (live) site is unaffected.
      if (!sub && env === "sandbox") {
        const { data: liveSub } = await supabase
          .from("subscriptions")
          .select(columns)
          .eq("workspace_id", wsId)
          .eq("environment", "live")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        sub = liveSub;
      }

      if (cancelled) return;
      setWorkspaceId(wsId);
      setTier((sub?.plan_tier as PlanTier) ?? null);
      setStatus((sub?.status as string) ?? null);
      setSetupFeePaid(Boolean(sub?.setup_fee_paid));
      setCurrentPeriodEnd((sub?.current_period_end as string) ?? null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [tick]);

  const periodOk = !currentPeriodEnd || new Date(currentPeriodEnd) > new Date();
  // Active statuses are always live; a canceled subscription still has access
  // until the end of its paid period (grace period).
  const isActive = Boolean(
    tier &&
      status &&
      ((ACTIVE_STATUSES.includes(status) && periodOk) ||
        (status === "canceled" && currentPeriodEnd && new Date(currentPeriodEnd) > new Date())),
  );

  const can = useCallback(
    (feature: Feature) => {
      if (!isActive || !tier) return false;
      return PLAN_FEATURES[tier].includes(feature);
    },
    [isActive, tier],
  );

  return {
    loading,
    workspaceId,
    isActive,
    tier,
    status,
    setupFeePaid,
    currentPeriodEnd,
    can,
    refresh,
  };
}
