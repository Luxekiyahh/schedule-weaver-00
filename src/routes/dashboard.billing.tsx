import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStripeCheckout } from "@/hooks/useStripeCheckout";
import { useServerFn } from "@tanstack/react-start";
import { changeSubscriptionPlan } from "@/utils/payments.functions";
import { getStripeEnvironment } from "@/lib/stripe";
import { useSubscription } from "@/hooks/useSubscription";
import { PLANS, planByTier, PLAN_RANK, SETUP_FEE_CENTS, SETUP_FEE_PRICE_ID, type PlanTier } from "@/lib/entitlements";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2, ArrowLeft, Sparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/billing")({
  component: BillingPage,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login" });
  },
  head: () => ({ meta: [{ title: "Billing & Plan — Dashboard" }] }),
});

function money(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);
}

function BillingPage() {
  const sub = useSubscription();
  const { openCheckout, loading: checkoutLoading } = usePaddleCheckout();
  const [email, setEmail] = useState<string | undefined>();
  const [pendingTier, setPendingTier] = useState<PlanTier | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? undefined));
  }, []);

  // Refetch after returning from a successful checkout.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") === "success") {
      toast.success("Thanks! Your plan is being activated — this can take a few seconds.");
      const interval = setInterval(() => sub.refresh(), 3000);
      const stop = setTimeout(() => clearInterval(interval), 15000);
      window.history.replaceState({}, "", "/dashboard/billing");
      return () => { clearInterval(interval); clearTimeout(stop); };
    }
  }, []);

  async function handleSelect(tier: PlanTier) {
    if (!sub.workspaceId) {
      toast.error("No workspace found for your account.");
      return;
    }
    setPendingTier(tier);
    const plan = planByTier(tier);
    // First-time subscribers pay the one-time setup fee alongside their plan.
    const priceIds = sub.setupFeePaid ? [plan.priceId] : [SETUP_FEE_PRICE_ID, plan.priceId];
    try {
      await openCheckout({
        priceIds,
        customerEmail: email,
        customData: { workspaceId: sub.workspaceId },
        successUrl: `${window.location.origin}/dashboard/billing?checkout=success`,
      });
    } catch (e) {
      toast.error("Could not open checkout", { description: String(e) });
    } finally {
      setPendingTier(null);
    }
  }

  const currentTier = sub.isActive ? sub.tier : null;

  return (
    <div className="min-h-screen bg-slate-50">
      <PaymentTestModeBanner />
      <div className="max-w-5xl mx-auto p-6 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <Link to="/dashboard/home" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-2">
              <ArrowLeft className="h-4 w-4" /> Back to dashboard
            </Link>
            <h1 className="text-3xl font-semibold tracking-tight">Billing & Plan</h1>
            <p className="text-muted-foreground mt-1">Choose the plan that fits your business.</p>
          </div>
        </div>

        {/* Current status */}
        {sub.loading ? (
          <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading your plan…</div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Current plan
                {currentTier ? (
                  <Badge className="bg-indigo-600">{planByTier(currentTier).name}</Badge>
                ) : (
                  <Badge variant="secondary">No active plan</Badge>
                )}
              </CardTitle>
              <CardDescription>
                {currentTier
                  ? sub.status === "past_due"
                    ? "Your last payment failed — please update your payment method to keep your features."
                    : `Active${sub.currentPeriodEnd ? ` · renews ${new Date(sub.currentPeriodEnd).toLocaleDateString()}` : ""}.`
                  : `Subscribe to launch your booking site. A one-time ${money(SETUP_FEE_CENTS)} setup & design fee applies to all plans.`}
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {/* Plans */}
        <div className="grid gap-6 md:grid-cols-3">
          {PLANS.map((plan) => {
            const isCurrent = currentTier === plan.tier;
            const isUpgrade = currentTier ? PLAN_RANK[plan.tier] > PLAN_RANK[currentTier] : false;
            const isDowngrade = currentTier ? PLAN_RANK[plan.tier] < PLAN_RANK[currentTier] : false;
            const busy = checkoutLoading && pendingTier === plan.tier;
            return (
              <Card key={plan.tier} className={isCurrent ? "border-indigo-500 ring-1 ring-indigo-500" : plan.tier === "pro" ? "border-indigo-200" : ""}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{plan.name}</CardTitle>
                    {plan.tier === "pro" && !isCurrent && (
                      <Badge variant="secondary" className="gap-1"><Sparkles className="h-3 w-3" /> Popular</Badge>
                    )}
                  </div>
                  <div className="mt-2">
                    <span className="text-3xl font-bold">{money(plan.monthlyCents)}</span>
                    <span className="text-muted-foreground">/mo</span>
                  </div>
                  <CardDescription>{plan.tagline}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2 text-sm">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-indigo-600 mt-0.5 shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full"
                    variant={isCurrent ? "secondary" : "default"}
                    disabled={isCurrent || busy || sub.loading}
                    onClick={() => handleSelect(plan.tier)}
                  >
                    {busy ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : isCurrent ? (
                      "Current plan"
                    ) : isUpgrade ? (
                      "Upgrade"
                    ) : isDowngrade ? (
                      "Switch to this plan"
                    ) : (
                      "Choose plan"
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {!sub.setupFeePaid && (
          <p className="text-center text-sm text-muted-foreground">
            A one-time {money(SETUP_FEE_CENTS)} setup & design fee is included with your first subscription.
          </p>
        )}
      </div>
    </div>
  );
}
