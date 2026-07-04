import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import {
  ChevronLeft,
  CreditCard,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  getPaymentSettings,
  savePaymentSettings,
  type PaymentProvider,
  type DepositType,
} from "@/utils/payment-settings.functions";
import {
  saveProviderCredentials,
  disconnectProvider,
} from "@/utils/payment-connect.functions";
import { getStripeEnvironment } from "@/lib/stripe";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/dashboard/payments")({
  component: PaymentsPage,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/onboarding" });
  },
  head: () => ({ meta: [{ title: "Payments — Dashboard" }] }),
});

const PROVIDER_META: Record<
  Exclude<PaymentProvider, "none">,
  { label: string; blurb: string; badge: string }
> = {
  stripe: {
    label: "Stripe",
    blurb: "Cards, Apple Pay & Google Pay. Best all-round option.",
    badge: "Recommended",
  },
  paypal: {
    label: "PayPal",
    blurb: "Let guests pay with their PayPal balance or card.",
    badge: "",
  },
  square: {
    label: "Square",
    blurb: "Great if you already use Square in-person.",
    badge: "",
  },
};

function PaymentsPage() {
  const navigate = useNavigate();
  const getSettings = useServerFn(getPaymentSettings);
  const saveSettings = useServerFn(savePaymentSettings);
  const saveCredentials = useServerFn(saveProviderCredentials);
  const disconnect = useServerFn(disconnectProvider);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [workspaceName, setWorkspaceName] = useState("Workspace");

  const [provider, setProvider] = useState<PaymentProvider>("none");
  const [connectionStatus, setConnectionStatus] = useState<
    "disconnected" | "pending" | "connected" | "error"
  >("disconnected");
  const [depositType, setDepositType] = useState<DepositType>("none");
  const [depositAmount, setDepositAmount] = useState("0.00");
  const [depositPercent, setDepositPercent] = useState("0");
  const [currency, setCurrency] = useState("USD");

  // Credentials dialog
  const [connectOpen, setConnectOpen] = useState(false);
  const [credEnv, setCredEnv] = useState<"sandbox" | "live">("live");
  const [stripeSecretKey, setStripeSecretKey] = useState("");
  const [stripePublishableKey, setStripePublishableKey] = useState("");
  const [paypalClientId, setPaypalClientId] = useState("");
  const [paypalSecret, setPaypalSecret] = useState("");
  const [squareAccessToken, setSquareAccessToken] = useState("");

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data: mem } = await supabase
        .from("workspace_members")
        .select("workspace_id, workspaces(name)")
        .eq("user_id", u.user.id)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();
      if (!mem) {
        setLoading(false);
        return;
      }
      const wsId = mem.workspace_id as string;
      setWorkspaceId(wsId);
      const ws = (mem as unknown as { workspaces?: { name?: string } | null }).workspaces;
      setWorkspaceName(ws?.name ?? "Workspace");

      try {
        const s = await getSettings({ data: { workspaceId: wsId } });
        setProvider(s.provider);
        setConnectionStatus(s.connectionStatus);
        setDepositType(s.depositType);
        setDepositAmount((s.depositAmountCents / 100).toFixed(2));
        setDepositPercent(String(s.depositPercent));
        setCurrency(s.currency);

      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Couldn't load payment settings");
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async () => {
    if (!workspaceId) {
      toast.error("No workspace found for your account.");
      return;
    }
    setSaving(true);
    try {
      const s = await saveSettings({
        data: {
          workspaceId,
          provider,
          depositType,
          depositAmountCents: Math.round(parseFloat(depositAmount || "0") * 100),
          depositPercent: parseFloat(depositPercent || "0"),
          currency,
        },
      });
      setConnectionStatus(s.connectionStatus);
      toast.success("Payment settings saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save settings");
    }
    setSaving(false);
  };

  const openConnect = () => {
    if (provider === "none") return;
    // Square is live-only; other providers default by environment guess.
    setCredEnv(provider === "square" ? "live" : getStripeEnvironment());
    setStripeSecretKey("");
    setStripePublishableKey("");
    setPaypalClientId("");
    setPaypalSecret("");
    setSquareAccessToken("");
    setConnectOpen(true);
  };

  const handleSaveCredentials = async () => {
    if (!workspaceId || provider === "none") return;
    setConnecting(true);
    try {
      const res = await saveCredentials({
        data: {
          workspaceId,
          provider: provider as Exclude<PaymentProvider, "none">,
          environment: credEnv,
          stripeSecretKey: stripeSecretKey || undefined,
          stripePublishableKey: stripePublishableKey || undefined,
          paypalClientId: paypalClientId || undefined,
          paypalSecret: paypalSecret || undefined,
          squareAccessToken: squareAccessToken || undefined,
        },
      });
      if ("error" in res) {
        toast.error(res.error);
      } else {
        setConnectionStatus("connected");
        setConnectOpen(false);
        toast.success("Account connected — you can now collect payments from clients.");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't verify those credentials.");
    }
    setConnecting(false);
  };

  const handleDisconnect = async () => {
    if (!workspaceId) return;
    setConnecting(true);
    try {
      await disconnect({ data: { workspaceId } });
      setConnectionStatus("disconnected");
      toast.success("Account disconnected.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't disconnect.");
    }
    setConnecting(false);
  };


  const statusPill = useMemo(() => {
    if (provider === "none") return null;
    if (connectionStatus === "connected")
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
          <CheckCircle2 className="h-3.5 w-3.5" /> Connected
        </span>
      );
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700">
        <AlertCircle className="h-3.5 w-3.5" /> Not connected
      </span>
    );
  }, [provider, connectionStatus]);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-[820px] px-6 py-6">
        <button
          onClick={() => navigate({ to: "/dashboard/home" })}
          className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-slate-500 transition hover:text-slate-900"
        >
          <ChevronLeft className="h-4 w-4" /> Back to Dashboard
        </button>

        <div className="mb-6 flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-slate-900 text-white">
            <Wallet className="h-4 w-4" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-400">{workspaceName}</p>
            <h1 className="text-lg font-semibold text-slate-900">Payments</h1>
          </div>
        </div>

        {loading ? (
          <div className="grid place-items-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Provider selection */}
            <section className="rounded-2xl border bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">
                    Where do your payments go?
                  </h2>
                  <p className="text-xs text-slate-500">
                    Choose the provider that collects payments from your clients.
                  </p>
                </div>
                {statusPill}
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {(["stripe", "paypal", "square"] as const).map((p) => {
                  const meta = PROVIDER_META[p];
                  const active = provider === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setProvider(p)}
                      className={`relative rounded-xl border p-4 text-left transition ${
                        active
                          ? "border-slate-900 ring-2 ring-slate-900/10"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      {meta.badge && (
                        <span className="absolute right-3 top-3 rounded-full bg-slate-900 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-white">
                          {meta.badge}
                        </span>
                      )}
                      <CreditCard className="mb-2 h-5 w-5 text-slate-700" />
                      <p className="text-sm font-semibold text-slate-900">{meta.label}</p>
                      <p className="mt-1 text-xs text-slate-500">{meta.blurb}</p>
                    </button>
                  );
                })}
              </div>

              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => setProvider("none")}
                  className={`text-xs font-medium ${
                    provider === "none" ? "text-slate-900" : "text-slate-400 hover:text-slate-600"
                  }`}
                >
                  Don't collect payments online (book without payment)
                </button>
              </div>

              {provider !== "none" && (
                <div className="mt-5 flex items-center justify-between rounded-xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-600">
                    {connectionStatus === "connected"
                      ? `Your ${PROVIDER_META[provider as Exclude<PaymentProvider, "none">].label} account is connected and ready to accept payments.`
                      : `Add your ${PROVIDER_META[provider as Exclude<PaymentProvider, "none">].label} API keys so payouts go directly to you.`}
                  </p>
                  <div className="flex items-center gap-2">
                    {connectionStatus === "connected" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleDisconnect}
                        disabled={connecting}
                      >
                        Disconnect
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={openConnect}
                      disabled={connecting}
                    >
                      {connecting && <Loader2 className="h-4 w-4 animate-spin" />}
                      {connectionStatus === "connected" ? "Update keys" : "Connect account"}
                    </Button>
                  </div>
                </div>
              )}
            </section>


            {/* Deposit policy */}
            <section className="rounded-2xl border bg-white p-6 shadow-sm">
              <h2 className="mb-1 text-sm font-semibold text-slate-900">Upfront payment</h2>
              <p className="mb-4 text-xs text-slate-500">
                Decide how much guests pay when they book.
              </p>

              <div className="grid gap-3 sm:grid-cols-3">
                {(
                  [
                    ["none", "No upfront", "Pay in person"],
                    ["deposit", "Deposit", "Collect a partial amount"],
                    ["full", "Full payment", "Charge the full price"],
                  ] as const
                ).map(([val, label, sub]) => {
                  const active = depositType === val;
                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setDepositType(val)}
                      className={`rounded-xl border p-4 text-left transition ${
                        active
                          ? "border-slate-900 ring-2 ring-slate-900/10"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <p className="text-sm font-semibold text-slate-900">{label}</p>
                      <p className="mt-1 text-xs text-slate-500">{sub}</p>
                    </button>
                  );
                })}
              </div>

              {depositType === "deposit" && (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-slate-600">
                      Fixed amount ({currency})
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-slate-600">
                      …or percentage of total (%)
                    </span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={depositPercent}
                      onChange={(e) => setDepositPercent(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
                    />
                  </label>
                  <p className="text-[11px] text-slate-400 sm:col-span-2">
                    If both are set, the fixed amount takes priority.
                  </p>
                </div>
              )}

              <label className="mt-4 block max-w-[200px]">
                <span className="mb-1 block text-xs font-medium text-slate-600">Currency</span>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-900 focus:outline-none"
                >
                  {["USD", "CAD", "EUR", "GBP", "AUD"].map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
            </section>

            <div className="flex justify-end">
              <Button className="bg-slate-900 hover:bg-slate-800" onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Save settings
              </Button>
            </div>
          </div>
        )}
      </div>

      <Dialog open={connectOpen} onOpenChange={setConnectOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Connect {provider !== "none" ? PROVIDER_META[provider as Exclude<PaymentProvider, "none">].label : ""}
            </DialogTitle>
            <DialogDescription>
              Paste your API keys below. We verify them with the provider and store them securely so
              payments go directly to your own account.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="flex items-center gap-2">
              <Label className="text-xs text-slate-500">Environment</Label>
              <select
                className="rounded-md border border-slate-200 px-2 py-1 text-sm"
                value={credEnv}
                onChange={(e) => setCredEnv(e.target.value as "sandbox" | "live")}
              >
                <option value="live">Live</option>
                <option value="sandbox">Sandbox / Test</option>
              </select>
            </div>

            {provider === "stripe" && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="stripe-secret">Secret key</Label>
                  <Input
                    id="stripe-secret"
                    type="password"
                    placeholder="sk_live_… or sk_test_…"
                    value={stripeSecretKey}
                    onChange={(e) => setStripeSecretKey(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="stripe-pub">Publishable key (optional)</Label>
                  <Input
                    id="stripe-pub"
                    placeholder="pk_live_… or pk_test_…"
                    value={stripePublishableKey}
                    onChange={(e) => setStripePublishableKey(e.target.value)}
                  />
                </div>
              </>
            )}

            {provider === "paypal" && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="pp-client">Client ID</Label>
                  <Input
                    id="pp-client"
                    value={paypalClientId}
                    onChange={(e) => setPaypalClientId(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pp-secret">Secret</Label>
                  <Input
                    id="pp-secret"
                    type="password"
                    value={paypalSecret}
                    onChange={(e) => setPaypalSecret(e.target.value)}
                  />
                </div>
              </>
            )}

            {provider === "square" && (
              <div className="space-y-1.5">
                <Label htmlFor="sq-token">Access token</Label>
                <Input
                  id="sq-token"
                  type="password"
                  value={squareAccessToken}
                  onChange={(e) => setSquareAccessToken(e.target.value)}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setConnectOpen(false)} disabled={connecting}>
              Cancel
            </Button>
            <Button
              className="bg-slate-900 hover:bg-slate-800"
              onClick={handleSaveCredentials}
              disabled={connecting}
            >
              {connecting && <Loader2 className="h-4 w-4 animate-spin" />}
              Verify & connect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
