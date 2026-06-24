import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStripeCheckout } from "@/hooks/useStripeCheckout";
import { useServerFn } from "@tanstack/react-start";
import { changeSubscriptionPlan } from "@/utils/payments.functions";
import { getStripeEnvironment } from "@/lib/stripe";
import { useSubscription } from "@/hooks/useSubscription";
import {
  PLANS,
  planByTier,
  PLAN_RANK,
  DESIGN_FEE_CENTS,
  DESIGN_FEE_PRICE_ID,
  DESIGN_FEE_NAME,
  centsFor,
  priceIdFor,
  type BillingPeriod,
  type PlanTier,
} from "@/lib/entitlements";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2, ChevronLeft, Sparkles, Wand2 } from "lucide-react";
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
  const navigate = useNavigate();

  const sub = useSubscription();
  const { openCheckout, openPortal, loading: checkoutLoading } = useStripeCheckout();
  const changePlan = useServerFn(changeSubscriptionPlan);
  const [email, setEmail] = useState<string | undefined>();
  const [period, setPeriod] = useState<BillingPeriod>("monthly");
  const [pendingTier, setPendingTier] = useState<PlanTier | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [designPending, setDesignPending] = useState(false);

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
    try {
      // Existing subscribers switch plans immediately with proration.
      if (sub.isActive) {
        await changePlan({
          data: {
            workspaceId: sub.workspaceId,
            environment: getStripeEnvironment(),
            priceLookupKey: priceIdFor(tier, period),
          },
        });
        toast.success(`Switched to ${plan.name}. Your access updates immediately.`);
        const interval = setInterval(() => sub.refresh(), 3000);
        setTimeout(() => clearInterval(interval), 15000);
        return;
      }
      // New subscribers go straight to checkout — no bundled fee.
      await openCheckout({
        workspaceId: sub.workspaceId,
        priceLookupKeys: [priceIdFor(tier, period)],
        customerEmail: email,
        successPath: "/dashboard/billing",
        cancelPath: "/dashboard/billing",
      });
    } catch (e) {
      toast.error("Could not update your plan", { description: String(e) });
    } finally {
      setPendingTier(null);
    }
  }

  async function handleDesignFee() {
    if (!sub.workspaceId) return;
    setDesignPending(true);
    try {
      await openCheckout({
        workspaceId: sub.workspaceId,
        priceLookupKeys: [DESIGN_FEE_PRICE_ID],
        includeSetupFee: true,
        customerEmail: email,
        successPath: "/dashboard/billing",
        cancelPath: "/dashboard/billing",
      });
    } catch (e) {
      toast.error("Could not open checkout", { description: String(e) });
    } finally {
      setDesignPending(false);
    }
  }

  async function handleManage() {
    if (!sub.workspaceId) return;
    setPortalLoading(true);
    try {
      await openPortal({ workspaceId: sub.workspaceId, returnPath: "/dashboard/billing" });
    } catch (e) {
      toast.error("Could not open the billing portal", { description: String(e) });
    } finally {
      setPortalLoading(false);
    }
  }

  const currentTier = sub.isActive ? sub.tier : null;

  return (
    <div className="min-h-screen bg-slate-50">
      <PaymentTestModeBanner />
      <div className="max-w-5xl mx-auto p-6 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <button onClick={() => navigate({ to: "/dashboard/home" })} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-2">
              <ChevronLeft className="h-4 w-4" /> Back to Dashboard
            </button>

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
                  : "Subscribe to launch your booking site. Your wizard-built site is included free with every plan."}
              </CardDescription>
            </CardHeader>
            {currentTier && (
              <CardContent>
                <Button variant="outline" onClick={handleManage} disabled={portalLoading}>
                  {portalLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Manage subscription"}
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  Update payment method, view invoices, or cancel. Cancelling keeps your access until the end of the billing period.
                </p>
              </CardContent>
            )}
          </Card>
        )}

        {/* Billing period toggle */}
        <div className="flex justify-center">
          <div className="inline-flex items-center rounded-full border border-slate-200 bg-white p-1 text-sm font-medium">
            <button
              type="button"
              onClick={() => setPeriod("monthly")}
              className={`rounded-full px-4 py-1.5 transition ${period === "monthly" ? "bg-indigo-600 text-white" : "text-slate-600"}`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setPeriod("yearly")}
              className={`rounded-full px-4 py-1.5 transition ${period === "yearly" ? "bg-indigo-600 text-white" : "text-slate-600"}`}
            >
              Annual
              <span className={`ml-1.5 text-xs ${period === "yearly" ? "text-indigo-100" : "text-emerald-600"}`}>2 months free</span>
            </button>
          </div>
        </div>

        {/* Plans */}
        <div className="grid gap-6 md:grid-cols-3">
          {PLANS.map((plan) => {
            const isCurrent = currentTier === plan.tier;
            const isUpgrade = currentTier ? PLAN_RANK[plan.tier] > PLAN_RANK[currentTier] : false;
            const isDowngrade = currentTier ? PLAN_RANK[plan.tier] < PLAN_RANK[currentTier] : false;
            const busy = checkoutLoading && pendingTier === plan.tier;
            const cents = centsFor(plan.tier, period);
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
                    <span className="text-3xl font-bold">{money(period === "yearly" ? cents / 12 : cents)}</span>
                    <span className="text-muted-foreground">/mo</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {period === "yearly" ? `${money(cents)} billed yearly` : "billed monthly"}
                  </p>
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

        {/* Optional Done-For-You Design upsell */}
        {!sub.setupFeePaid && (
          <Card className="border-indigo-200 bg-gradient-to-br from-indigo-50 to-white">
            <CardContent className="pt-6 md:flex md:items-center md:justify-between md:gap-6">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-indigo-600 p-2.5 text-white shrink-0">
                  <Wand2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{DESIGN_FEE_NAME} — optional</h3>
                  <p className="mt-1 text-sm text-muted-foreground max-w-xl">
                    Want us to take your site further? We'll personally build custom layouts, premium design, and brand
                    consultation. Competitors charge $500–$2,000+ — we do it for a one-time {money(DESIGN_FEE_CENTS)}.
                  </p>
                </div>
              </div>
              <div className="mt-4 md:mt-0 shrink-0">
                <Button variant="outline" onClick={handleDesignFee} disabled={designPending || sub.loading}>
                  {designPending ? <Loader2 className="h-4 w-4 animate-spin" /> : `Add for ${money(DESIGN_FEE_CENTS)}`}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
