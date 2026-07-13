import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getSystemHealth, pokeEmailQueue } from "@/lib/platform-admin.functions";
import { AdminGate, AdminNav } from "@/components/admin/AdminGate";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, CreditCard, MessageSquare, Mail, Clock, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/admin/health")({
  component: HealthPage,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login" });
  },
  head: () => ({ meta: [{ title: "System health — Procschedule Admin" }] }),
});

function HealthPage() {
  return (
    <AdminGate>
      <AdminNav />
      <HealthBody />
    </AdminGate>
  );
}

function HealthBody() {
  const fetchHealth = useServerFn(getSystemHealth);
  const poke = useServerFn(pokeEmailQueue);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  async function load() {
    setLoading(true);
    try {
      setData(await fetchHealth());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }
  if (!data) return null;

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">System health</h1>
        <Button size="sm" variant="outline" onClick={load}>
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card title="Stripe payment failures" icon={<CreditCard className="h-4 w-4 text-indigo-600" />}>
          {data.stripe.error && <div className="mb-2 text-xs text-amber-600">{data.stripe.error}</div>}
          <div className="mb-2 text-xs font-semibold uppercase text-slate-400">Past-due subscriptions ({data.stripe.pastDueSubscriptions.length})</div>
          {data.stripe.pastDueSubscriptions.length === 0 && <Empty text="None." />}
          {data.stripe.pastDueSubscriptions.map((s: any, i: number) => (
            <div key={i} className="py-1 text-xs text-slate-600">
              {s.plan_tier ?? "—"} · <span className="text-rose-600">{s.status}</span> · {s.environment}
            </div>
          ))}
          <div className="mb-2 mt-3 text-xs font-semibold uppercase text-slate-400">Recent failed charges ({data.stripe.failedCharges.length})</div>
          {data.stripe.failedCharges.length === 0 && <Empty text="None." />}
          {data.stripe.failedCharges.map((c: any) => (
            <div key={c.id} className="py-1 text-xs text-slate-600">
              {c.amount} {c.currency?.toUpperCase()} · <span className="text-rose-600">{c.failure_message ?? c.status}</span> ({c.env})
            </div>
          ))}
        </Card>

        <Card title="Twilio delivery failures" icon={<MessageSquare className="h-4 w-4 text-indigo-600" />}>
          {data.twilio.error && <div className="mb-2 text-xs text-amber-600">{data.twilio.error}</div>}
          <div className="mb-2 text-xs font-semibold uppercase text-slate-400">Live failed/undelivered ({data.twilio.failed.length})</div>
          {data.twilio.failed.length === 0 && <Empty text="None." />}
          {data.twilio.failed.map((m: any) => (
            <div key={m.sid} className="py-1 text-xs text-slate-600">
              {m.to} · <span className="text-rose-600">{m.status}</span>{m.error_code ? ` (${m.error_code})` : ""}
            </div>
          ))}
          <div className="mb-2 mt-3 text-xs font-semibold uppercase text-slate-400">Logged send failures ({data.twilio.recentFailedLogs.length})</div>
          {data.twilio.recentFailedLogs.length === 0 && <Empty text="None." />}
          {data.twilio.recentFailedLogs.map((s: any) => (
            <div key={s.id} className="py-1 text-xs text-slate-600">
              {s.to_number} · <span className="text-rose-600">{s.error_message ?? "failed"}</span>
            </div>
          ))}
        </Card>

        <Card title="Email failures" icon={<Mail className="h-4 w-4 text-indigo-600" />}>
          {data.email.recentFailures.length === 0 && <Empty text="No recent failures." />}
          {data.email.recentFailures.map((e: any) => (
            <div key={e.id} className="py-1 text-xs text-slate-600">
              {e.template_name} → {e.recipient_email} · <span className="text-rose-600">{e.status}</span>
            </div>
          ))}
        </Card>

        <Card
          title="Scheduled jobs (pg_cron)"
          icon={<Clock className="h-4 w-4 text-indigo-600" />}
          action={
            <Button size="sm" variant="ghost" onClick={async () => {
              try { await poke(); toast.success("Email queue poked"); } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
            }}>
              Poke email queue
            </Button>
          }
        >
          {data.cron.length === 0 && <Empty text="No cron jobs scheduled." />}
          {data.cron.map((j: any) => (
            <div key={j.jobid} className="border-b border-slate-100 py-1.5 text-xs last:border-0">
              <div className="flex justify-between">
                <span className="font-medium text-slate-700">{j.jobname}</span>
                <span className={j.last_status === "succeeded" ? "text-emerald-600" : j.last_status ? "text-rose-600" : "text-slate-400"}>
                  {j.last_status ?? "no runs"}
                </span>
              </div>
              <div className="text-slate-400">
                {j.schedule} · {j.active ? "active" : "inactive"}
                {j.last_start ? ` · last ${new Date(j.last_start).toLocaleString()}` : ""}
              </div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

function Card({ title, icon, action, children }: { title: string; icon: React.ReactNode; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">{icon}{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}
function Empty({ text }: { text: string }) {
  return <div className="py-1 text-sm text-slate-400">{text}</div>;
}
