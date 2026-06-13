import { createFileRoute, Link } from "@tanstack/react-router";
import { PLANS, SETUP_FEE_CENTS } from "@/lib/entitlements";
import { Button } from "@/components/ui/button";
import { Check, Sparkles } from "lucide-react";

export const Route = createFileRoute("/pricing")({
  component: PricingPage,
  head: () => ({
    meta: [
      { title: "Pricing — ProcSchedule" },
      {
        name: "description",
        content:
          "Simple plans for service businesses. We design your booking site, set up your automations, and keep clients rebooking. Plans from $30/mo.",
      },
      { property: "og:title", content: "Pricing — ProcSchedule" },
      {
        property: "og:description",
        content: "We design your booking site, set up your automations, and keep clients rebooking. Plans from $30/mo.",
      },
    ],
  }),
});

function money(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);
}

function PricingPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-6 py-16">
        <header className="text-center max-w-2xl mx-auto space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">Plans that pay for themselves</h1>
          <p className="text-lg text-muted-foreground">
            We design your booking website, set up your automation flows, and keep your clients coming back — so you can focus on the work.
          </p>
          <p className="inline-block rounded-full bg-indigo-50 text-indigo-700 px-4 py-1.5 text-sm font-medium">
            One-time {money(SETUP_FEE_CENTS)} design & setup fee on all plans
          </p>
        </header>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {PLANS.map((plan) => (
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
                <span className="text-4xl font-bold">{money(plan.monthlyCents)}</span>
                <span className="text-muted-foreground">/mo</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{plan.tagline}</p>
              <ul className="mt-6 space-y-3 text-sm flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-indigo-600 mt-0.5 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Button asChild className="mt-6 w-full" variant={plan.tier === "pro" ? "default" : "secondary"}>
                <Link to="/signup">Get started</Link>
              </Button>
            </div>
          ))}
        </div>

        <p className="mt-10 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/dashboard/billing" className="text-indigo-600 font-medium hover:underline">
            Manage your plan
          </Link>
        </p>
      </div>
    </main>
  );
}
