import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStripeCheckout } from "@/hooks/useStripeCheckout";
import { useSubscription } from "@/hooks/useSubscription";
import {
  PLANS,
  DESIGN_FEE_CENTS,
  DESIGN_FEE_PRICE_ID,
  DESIGN_FEE_NAME,
  centsFor,
  priceIdFor,
  type BillingPeriod,
  type PlanTier,
} from "@/lib/entitlements";
import { Button } from "@/components/ui/button";
import { Check, Sparkles, Loader2, Wand2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/pricing")({
  component: PricingPage,
  head: () => ({
    meta: [
      { title: "Pricing — ProcSchedule" },
      {
        name: "description",
        content:
          "Your booking site is built automatically and included in every plan. Plans from $30/mo, or save with annual billing (2 months free).",
      },
      { property: "og:title", content: "Pricing — ProcSchedule" },
      {
        property: "og:description",
        content: "Your booking site is built automatically and included in every plan. Plans from $30/mo, 2 months free on annual.",
      },
    ],
  }),
});

function money(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);
}

function PricingPage() {
  const navigate = useNavigate();
  const sub = useSubscription();
  const { openCheckout, loading: checkoutLoading } = useStripeCheckout();
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);
  const [email, setEmail] = useState<string | undefined>();
  const [period, setPeriod] = useState<BillingPeriod>("monthly");
  const [pendingTier, setPendingTier] = useState<PlanTier | null>(null);
  const [designPending, setDesignPending] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setIsAuthed(!!data.user);
      setEmail(data.user?.email ?? undefined);
      setAuthChecked(true);
    });
  }, []);

  async function handleSelect(tier: PlanTier) {
    // Logged-out visitors create their account & site first.
    if (!isAuthed) {
      navigate({ to: "/onboarding" });
      return;
    }
    if (!sub.workspaceId) {
      toast.error("No workspace found for your account.");
      return;
    }
    setPendingTier(tier);
    try {
      await openCheckout({
        workspaceId: sub.workspaceId,
        priceLookupKeys: [priceIdFor(tier, period)],
        customerEmail: email,
        successPath: "/dashboard/home",
        cancelPath: "/pricing",
      });
    } catch (e) {
      toast.error("Could not open checkout", { description: String(e) });
    } finally {
      setPendingTier(null);
    }
  }

  async function handleDesignFee() {
    if (!isAuthed) {
      navigate({ to: "/onboarding" });
      return;
    }
    if (!sub.workspaceId) {
      toast.error("No workspace found for your account.");
      return;
    }
    setDesignPending(true);
    try {
      await openCheckout({
        workspaceId: sub.workspaceId,
        priceLookupKeys: [DESIGN_FEE_PRICE_ID],
        includeSetupFee: true,
        customerEmail: email,
        successPath: "/dashboard/home",
        cancelPath: "/pricing",
      });
    } catch (e) {
      toast.error("Could not open checkout", { description: String(e) });
    } finally {
      setDesignPending(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-6 py-16">
        <header className="text-center max-w-2xl mx-auto space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">Plans that pay for themselves</h1>
          <p className="text-lg text-muted-foreground">
            Our wizard builds your branded booking site automatically — included free with every plan. Pick the automation that keeps clients coming back.
          </p>

          {/* Billing period toggle */}
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
        </header>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {PLANS.map((plan) => {
            const busy = checkoutLoading && pendingTier === plan.tier;
            const cents = centsFor(plan.tier, period);
            return (
              <div
                key={plan.tier}
                className={`rounded-2xl border bg-white p-6 flex flex-col ${
                  plan.tier === "pro" ? "border-indigo-500 ring-1 ring-indigo-500 shadow-lg" : "border-slate-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">{plan.name}</h2>
                  {plan.tier === "pro" && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-indigo-600 text-white px-2.5 py-1 text-xs font-medium">
                      <Sparkles className="h-3 w-3" /> Most popular
                    </span>
                  )}
                </div>
                <div className="mt-4">
                  <span className="text-4xl font-bold">{money(period === "yearly" ? cents / 12 : cents)}</span>
                  <span className="text-muted-foreground">/mo</span>
                </div>
                <p className="mt-1 h-5 text-xs text-muted-foreground">
                  {period === "yearly" ? `${money(cents)} billed yearly` : "billed monthly"}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">{plan.tagline}</p>
                <ul className="mt-6 space-y-3 text-sm flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-indigo-600 mt-0.5 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="mt-6 w-full"
                  variant={plan.tier === "pro" ? "default" : "secondary"}
                  disabled={!authChecked || busy || (isAuthed && sub.loading)}
                  onClick={() => handleSelect(plan.tier)}
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Get started"}
                </Button>
              </div>
            );
          })}
        </div>

        {/* Optional Done-For-You Design add-on */}
        <div className="mt-10 rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-white p-6 md:flex md:items-center md:justify-between md:gap-6">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-indigo-600 p-2.5 text-white shrink-0">
              <Wand2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">{DESIGN_FEE_NAME} — optional</h3>
              <p className="mt-1 text-sm text-muted-foreground max-w-xl">
                Love your wizard-built site but want more? We'll personally craft custom layouts, premium design, and brand
                consultation. Competitors charge $500–$2,000+ for custom setup — we do it for a one-time {money(DESIGN_FEE_CENTS)}.
              </p>
            </div>
          </div>
          <div className="mt-4 md:mt-0 shrink-0">
            <Button variant="outline" onClick={handleDesignFee} disabled={designPending || (isAuthed && sub.loading)}>
              {designPending ? <Loader2 className="h-4 w-4 animate-spin" /> : `Add for ${money(DESIGN_FEE_CENTS)}`}
            </Button>
          </div>
        </div>

        <p className="mt-10 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <a href="/dashboard/billing" className="text-indigo-600 font-medium hover:underline">
            Manage your plan
          </a>
        </p>
      </div>
    </main>
  );
}
