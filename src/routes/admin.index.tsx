import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getSystemHealth } from "@/lib/platform-admin.functions";
import { AdminGate, AdminNav } from "@/components/admin/AdminGate";
import { Loader2, Users, Ban, CalendarCheck, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/admin/")({
  component: AdminOverview,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login" });
  },
  head: () => ({ meta: [{ title: "Admin Overview — Procschedule" }] }),
});

function AdminOverview() {
  return (
    <AdminGate>
      <AdminNav />
      <OverviewBody />
    </AdminGate>
  );
}

function OverviewBody() {
  const fetchHealth = useServerFn(getSystemHealth);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetchHealth();
        setStats(res.stats);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  const s = stats ?? {};
  const tiles = [
    { label: "Total tenants", value: s.total_tenants ?? 0, icon: Users, color: "text-primary" },
    { label: "Suspended", value: s.suspended_tenants ?? 0, icon: Ban, color: "text-rose-600" },
    { label: "Bookings (7d)", value: s.bookings_7d ?? 0, icon: CalendarCheck, color: "text-emerald-600" },
    { label: "Bookings (30d)", value: s.bookings_30d ?? 0, icon: CalendarCheck, color: "text-emerald-600" },
    { label: "Email failures (7d)", value: s.email_failures_7d ?? 0, icon: AlertTriangle, color: "text-amber-600" },
    { label: "SMS failures (7d)", value: s.sms_failures_7d ?? 0, icon: AlertTriangle, color: "text-amber-600" },
  ];

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight text-foreground">Overview</h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <t.icon className={`h-5 w-5 ${t.color}`} />
            <div className="mt-3 text-3xl font-semibold text-foreground">{t.value}</div>
            <div className="mt-1 text-sm text-muted-foreground">{t.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
