import { createFileRoute, redirect, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import {
  getTenantDetail,
  suspendTenant,
  reactivateTenant,
  impersonateTenant,
  resendWelcomeEmail,
  resendConfirmationSms,
  triggerAppointmentWebhook,
} from "@/lib/platform-admin.functions";
import { AdminGate, AdminNav } from "@/components/admin/AdminGate";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, ArrowLeft, LogIn, Ban, RotateCcw, Mail, MessageSquare, Webhook } from "lucide-react";
import { TENANT_ROOT_DOMAIN } from "@/lib/subdomain";

export const Route = createFileRoute("/admin/tenants/$id")({
  component: TenantDetailPage,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login" });
  },
  head: () => ({ meta: [{ title: "Tenant detail — Procschedule Admin" }] }),
});

function TenantDetailPage() {
  return (
    <AdminGate>
      <AdminNav />
      <DetailBody />
    </AdminGate>
  );
}

function money(cents: number, cur = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: cur }).format((cents || 0) / 100);
}

function DetailBody() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const fetchDetail = useServerFn(getTenantDetail);
  const doSuspend = useServerFn(suspendTenant);
  const doReactivate = useServerFn(reactivateTenant);
  const doImpersonate = useServerFn(impersonateTenant);
  const doResendEmail = useServerFn(resendWelcomeEmail);
  const doResendSms = useServerFn(resendConfirmationSms);
  const doWebhook = useServerFn(triggerAppointmentWebhook);

  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<any>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetchDetail({ data: { workspaceId: id } });
      setDetail(res);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load tenant");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function run(key: string, fn: () => Promise<any>, okMsg: string) {
    setBusy(key);
    try {
      await fn();
      toast.success(okMsg);
      if (key === "suspend" || key === "reactivate") await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(null);
    }
  }

  async function impersonate() {
    if (!window.confirm("This will sign you OUT of your admin account and sign you in as the tenant owner. Continue?")) {
      return;
    }
    setBusy("impersonate");
    try {
      const res = await doImpersonate({ data: { workspaceId: id } });
      const { error } = await supabase.auth.verifyOtp({ type: "magiclink", token_hash: res.tokenHash });
      if (error) throw error;
      toast.success(`Signed in as ${res.email}`);
      navigate({ to: "/dashboard/home" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Impersonation failed");
      setBusy(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }
  if (!detail) return null;

  const w = detail.workspace;
  const suspended = !!w.suspended_at;

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <Link to="/admin/tenants" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> All tenants
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{w.name}</h1>
          <a
            href={`https://${w.slug}.${TENANT_ROOT_DOMAIN}`}
            target="_blank"
            rel="noreferrer"
            className="font-mono text-sm text-primary hover:underline"
          >
            {w.slug}.{TENANT_ROOT_DOMAIN}
          </a>
          <div className="mt-1 text-sm text-muted-foreground">{w.owner_email}</div>
          {suspended && (
            <div className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
              Suspended{w.suspended_reason ? `: ${w.suspended_reason}` : ""}
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={impersonate} disabled={busy === "impersonate"}>
            {busy === "impersonate" ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
            Impersonate
          </Button>
          {suspended ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => run("reactivate", () => doReactivate({ data: { workspaceId: id } }), "Tenant reactivated")}
              disabled={busy === "reactivate"}
            >
              <RotateCcw className="h-4 w-4" /> Reactivate
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="text-rose-600"
              onClick={() => {
                const reason = window.prompt("Reason for suspension (optional):") ?? "";
                run("suspend", () => doSuspend({ data: { workspaceId: id, reason } }), "Tenant suspended");
              }}
              disabled={busy === "suspend"}
            >
              <Ban className="h-4 w-4" /> Suspend
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => run("email", () => doResendEmail({ data: { workspaceId: id } }), "Welcome email queued")}
            disabled={busy === "email"}
          >
            <Mail className="h-4 w-4" /> Resend welcome
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card title="Subscription & payments">
          <Row label="Status" value={detail.subscription?.status ?? "none"} />
          <Row label="Plan" value={detail.subscription?.plan_tier ?? "—"} />
          <Row label="Environment" value={detail.subscription?.environment ?? "—"} />
          <Row label="Payment provider" value={detail.payment?.provider ?? "not connected"} />
          <Row label="Connection" value={detail.payment?.connection_status ?? "—"} />
        </Card>

        <Card title={`Services (${detail.services.length})`}>
          {detail.services.length === 0 && <Empty text="No services." />}
          {detail.services.slice(0, 8).map((s: any) => (
            <div key={s.id} className="flex justify-between py-1 text-sm">
              <span className="text-foreground">
                {s.name} {!s.is_active && <span className="text-muted-foreground">(inactive)</span>}
              </span>
              <span className="text-muted-foreground">{money(s.price_cents, s.currency)}</span>
            </div>
          ))}
        </Card>
      </div>

      <Card title={`Recent bookings (${detail.appointments.length})`} className="mt-6">
        {detail.appointments.length === 0 && <Empty text="No bookings yet." />}
        {detail.appointments.map((a: any) => (
          <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-border py-2 text-sm last:border-0">
            <div>
              <span className="font-medium text-foreground">{a.customer?.full_name ?? "Unknown"}</span>
              <span className="text-muted-foreground"> · {a.service_name ?? "—"}</span>
              <div className="text-xs text-muted-foreground">
                {new Date(a.start_at).toLocaleString()} · <span className="capitalize">{a.status}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => run(`sms-${a.id}`, () => doResendSms({ data: { appointmentId: a.id } }), "Confirmation SMS sent")}
                disabled={busy === `sms-${a.id}`}
              >
                <MessageSquare className="h-3.5 w-3.5" /> SMS
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => run(`wh-${a.id}`, () => doWebhook({ data: { appointmentId: a.id } }), "Webhook replayed")}
                disabled={busy === `wh-${a.id}`}
              >
                <Webhook className="h-3.5 w-3.5" /> Webhook
              </Button>
            </div>
          </div>
        ))}
      </Card>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <Card title="Recent emails">
          {detail.emailLogs.length === 0 && <Empty text="No matching email logs." />}
          {detail.emailLogs.map((e: any) => (
            <div key={e.id} className="py-1 text-xs">
              <span className="font-medium text-foreground">{e.template_name}</span>
              <span className={e.status === "sent" ? "text-emerald-600" : "text-rose-600"}> · {e.status}</span>
              <span className="text-muted-foreground"> · {new Date(e.created_at).toLocaleDateString()}</span>
            </div>
          ))}
        </Card>
        <Card title="Recent SMS">
          {detail.smsLogs.length === 0 && <Empty text="No SMS logs yet." />}
          {detail.smsLogs.map((s: any) => (
            <div key={s.id} className="py-1 text-xs">
              <span className="font-medium text-foreground">{s.purpose ?? "sms"}</span>
              <span className={s.status === "sent" ? "text-emerald-600" : "text-rose-600"}> · {s.status}</span>
              <span className="text-muted-foreground"> · {new Date(s.created_at).toLocaleDateString()}</span>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

function Card({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-border bg-card p-5 shadow-sm ${className}`}>
      <h2 className="mb-3 text-sm font-semibold text-foreground">{title}</h2>
      {children}
    </div>
  );
}
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium capitalize text-foreground">{value}</span>
    </div>
  );
}
function Empty({ text }: { text: string }) {
  return <div className="py-2 text-sm text-muted-foreground">{text}</div>;
}
