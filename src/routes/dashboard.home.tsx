import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Calendar, Check, Copy, DollarSign, Sparkles, Clock, Users, Briefcase,
  Plus, Settings2, CalendarClock, UserSquare2, Loader2, CalendarX2,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/home")({
  component: HomePage,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/onboarding" });
  },
  head: () => ({ meta: [{ title: "Home — Dashboard" }] }),
});

type Role = "owner" | "admin" | "staff" | "client";
type Status = "pending" | "confirmed" | "cancelled" | "completed";

type Ctx = {
  firstName: string;
  workspaceId: string;
  workspaceName: string;
  workspaceSlug: string;
  role: Role;
  memberId: string;
};

type Appt = {
  id: string;
  start_at: string;
  end_at: string;
  status: Status;
  service: { name: string; price_cents: number; currency: string; duration_minutes: number } | null;
  customer: { full_name: string } | null;
};

const STATUS_STYLES: Record<Status, string> = {
  pending: "bg-amber-50 text-amber-700 ring-amber-200",
  confirmed: "bg-indigo-50 text-indigo-700 ring-indigo-200",
  completed: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  cancelled: "bg-slate-100 text-slate-500 ring-slate-200",
};

function money(cents: number, ccy = "USD") {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: ccy, maximumFractionDigits: 0 }).format(cents / 100);
}
function fmtTimeRange(a: string, b: string) {
  const f = (d: string) => new Date(d).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return `${f(a)} – ${f(b)}`;
}

function HomePage() {
  const [ctx, setCtx] = useState<Ctx | null>(null);
  const [loading, setLoading] = useState(true);
  const [weekAppts, setWeekAppts] = useState<Appt[]>([]);
  const [activeServices, setActiveServices] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data: mem } = await supabase
        .from("workspace_members")
        .select("id, role, workspace_id, workspaces(name, slug)")
        .eq("user_id", u.user.id)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();
      if (!mem) { setLoading(false); return; }
      const { data: prof } = await supabase
        .from("profiles").select("full_name, email").eq("id", u.user.id).maybeSingle();
      const ws = (mem as unknown as { workspaces?: { name?: string; slug?: string } | null }).workspaces;
      const first = (prof?.full_name ?? prof?.email ?? "there").split(" ")[0].split("@")[0];
      setCtx({
        firstName: first,
        workspaceId: mem.workspace_id,
        workspaceName: ws?.name ?? "Your workspace",
        workspaceSlug: ws?.slug ?? "",
        role: mem.role as Role,
        memberId: mem.id,
      });
    })();
  }, []);

  useEffect(() => {
    if (!ctx) return;
    (async () => {
      setLoading(true);
      const now = new Date();
      const weekStart = new Date(now); weekStart.setHours(0,0,0,0); weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 7);

      let q = supabase
        .from("appointments")
        .select("id, start_at, end_at, status, service:services(name, price_cents, currency, duration_minutes), customer:customers(full_name)")
        .eq("workspace_id", ctx.workspaceId)
        .gte("start_at", weekStart.toISOString())
        .lt("start_at", weekEnd.toISOString())
        .order("start_at", { ascending: true });
      if (ctx.role === "staff") q = q.eq("provider_id", ctx.memberId);

      const [apptRes, svcRes] = await Promise.all([
        q,
        supabase.from("services").select("id", { count: "exact", head: true }).eq("workspace_id", ctx.workspaceId).eq("is_active", true),
      ]);
      if (apptRes.error) toast.error(apptRes.error.message);
      setWeekAppts((apptRes.data ?? []) as Appt[]);
      setActiveServices(svcRes.count ?? 0);
      setLoading(false);
    })();
  }, [ctx]);

  const today = useMemo(() => {
    const s = new Date(); s.setHours(0,0,0,0);
    const e = new Date(s); e.setDate(e.getDate() + 1);
    return weekAppts.filter((a) => {
      const t = new Date(a.start_at).getTime();
      return t >= s.getTime() && t < e.getTime();
    });
  }, [weekAppts]);

  const metrics = useMemo(() => {
    const revenue = weekAppts
      .filter((a) => a.status === "confirmed" || a.status === "completed")
      .reduce((s, a) => s + (a.service?.price_cents ?? 0), 0);
    const hoursToday = today.reduce((s, a) => s + (a.service?.duration_minutes ?? 0), 0) / 60;
    const counts: Record<string, number> = {};
    weekAppts.forEach((a) => {
      const n = a.service?.name;
      if (n) counts[n] = (counts[n] ?? 0) + 1;
    });
    const topService = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
    return { revenue, hoursToday, topService };
  }, [weekAppts, today]);

  const bookingUrl = ctx ? `${typeof window !== "undefined" ? window.location.origin : ""}/book/${ctx.workspaceSlug}` : "";

  const copy = async () => {
    if (!bookingUrl) return;
    try {
      await navigator.clipboard.writeText(bookingUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy");
    }
  };

  if (!ctx) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-50">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  const isAdmin = ctx.role === "owner" || ctx.role === "admin";

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="mx-auto max-w-[1280px] px-6 py-10">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-indigo-600">
              <Sparkles className="h-3.5 w-3.5" /> {greeting()}
            </div>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">
              Welcome back, {ctx.firstName}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Here's what's happening at <span className="font-medium text-slate-700">{ctx.workspaceName}</span> today.
            </p>
          </div>
          <Link
            to="/dashboard/calendar"
            className="inline-flex items-center gap-1.5 rounded-lg border bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <Calendar className="h-4 w-4" /> Open calendar
          </Link>
        </div>

        {/* Public link share */}
        <div className="mt-6 overflow-hidden rounded-2xl border bg-gradient-to-r from-slate-900 to-indigo-900 p-5 text-white shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wider text-indigo-200">Your public booking link</p>
              <p className="mt-1 truncate font-mono text-sm text-white/90">{bookingUrl || "—"}</p>
            </div>
            <button
              onClick={copy}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                copied ? "bg-emerald-400 text-emerald-950" : "bg-white text-slate-900 hover:bg-slate-100"
              }`}
            >
              {copied ? <><Check className="h-4 w-4" /> Copied!</> : <><Copy className="h-4 w-4" /> Copy link</>}
            </button>
          </div>
        </div>

        {/* Metrics */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)
          ) : isAdmin ? (
            <>
              <Metric icon={<Clock className="h-4 w-4" />} label="Today's schedule" value={today.length.toString()} hint="appointments" />
              <Metric icon={<DollarSign className="h-4 w-4" />} label="Estimated revenue this week" value={money(metrics.revenue)} hint="confirmed + completed" accent />
              <Metric icon={<Briefcase className="h-4 w-4" />} label="Active services" value={activeServices.toString()} hint="currently bookable" />
            </>
          ) : (
            <>
              <Metric icon={<Clock className="h-4 w-4" />} label="Your appointments today" value={today.length.toString()} hint="assigned to you" />
              <Metric icon={<CalendarClock className="h-4 w-4" />} label="Hours scheduled today" value={metrics.hoursToday.toFixed(1)} hint="across all bookings" />
              <Metric icon={<Sparkles className="h-4 w-4" />} label="Your most booked service" value={metrics.topService} hint="this week" />
            </>
          )}
        </div>

        {/* Split layout */}
        <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          {/* Today's lineup */}
          <section className="rounded-2xl border bg-white shadow-sm">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Today's lineup</h2>
                <p className="text-xs text-slate-500">
                  {new Date().toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                {today.length} {today.length === 1 ? "booking" : "bookings"}
              </span>
            </div>
            <div className="divide-y">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex animate-pulse items-center gap-4 px-5 py-4">
                    <div className="h-10 w-20 rounded bg-slate-100" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-1/2 rounded bg-slate-100" />
                      <div className="h-3 w-1/3 rounded bg-slate-100" />
                    </div>
                  </div>
                ))
              ) : today.length === 0 ? (
                <div className="px-5 py-16 text-center">
                  <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-indigo-50">
                    <CalendarX2 className="h-6 w-6 text-indigo-500" />
                  </div>
                  <p className="mt-4 text-sm font-medium text-slate-900">You're clear for today!</p>
                  <p className="mt-1 text-xs text-slate-500">No bookings scheduled. Enjoy the breathing room.</p>
                </div>
              ) : (
                today.map((a) => (
                  <div key={a.id} className="flex items-center gap-4 px-5 py-4 transition hover:bg-slate-50">
                    <div className="w-24 shrink-0">
                      <p className="text-sm font-semibold text-slate-900">
                        {new Date(a.start_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                      </p>
                      <p className="text-[11px] text-slate-400">{fmtTimeRange(a.start_at, a.end_at)}</p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {a.customer?.full_name ?? "Client"}
                      </p>
                      <p className="truncate text-xs text-slate-500">{a.service?.name ?? "Service"}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ring-1 ${STATUS_STYLES[a.status]}`}>
                      {a.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Quick actions */}
          <section>
            <h2 className="mb-3 px-1 text-base font-semibold text-slate-900">Quick actions</h2>
            <div className="grid grid-cols-2 gap-3">
              <ActionCard to="/dashboard/calendar" icon={<Plus className="h-5 w-5" />} title="Book appointment" desc="Manually create a booking" tone="indigo" />
              <ActionCard to="/dashboard/calendar" icon={<Settings2 className="h-5 w-5" />} title="Manage services" desc="Pricing & catalog" tone="emerald" />
              <ActionCard to="/dashboard/calendar" icon={<CalendarClock className="h-5 w-5" />} title="Update availability" desc="Working hours" tone="amber" />
              <ActionCard to="/dashboard/calendar" icon={<UserSquare2 className="h-5 w-5" />} title="Client list" desc="View profiles" tone="rose" />
            </div>

            <div className="mt-4 rounded-2xl border bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-slate-500">
                <Users className="h-3.5 w-3.5" /> Tip
              </div>
              <p className="mt-2 text-sm text-slate-700">
                Share your booking link on social or in your email signature — every new client starts there.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function Metric({
  icon, label, value, hint, accent,
}: { icon: React.ReactNode; label: string; value: string; hint?: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border bg-white p-5 shadow-sm transition hover:shadow-md ${accent ? "ring-1 ring-indigo-100" : ""}`}>
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-slate-500">
        <span className={`grid h-6 w-6 place-items-center rounded-md ${accent ? "bg-indigo-50 text-indigo-600" : "bg-slate-100 text-slate-600"}`}>
          {icon}
        </span>
        {label}
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-2xl border bg-white p-5 shadow-sm">
      <div className="h-3 w-24 rounded bg-slate-100" />
      <div className="mt-4 h-7 w-20 rounded bg-slate-100" />
      <div className="mt-2 h-2 w-32 rounded bg-slate-100" />
    </div>
  );
}

const TONES: Record<string, string> = {
  indigo: "bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100",
  emerald: "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100",
  amber: "bg-amber-50 text-amber-600 group-hover:bg-amber-100",
  rose: "bg-rose-50 text-rose-600 group-hover:bg-rose-100",
};

function ActionCard({
  to, icon, title, desc, tone,
}: { to: string; icon: React.ReactNode; title: string; desc: string; tone: keyof typeof TONES }) {
  return (
    <Link
      to={to}
      className="group flex flex-col gap-3 rounded-2xl border bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <span className={`grid h-10 w-10 place-items-center rounded-xl transition ${TONES[tone]}`}>{icon}</span>
      <div>
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <p className="text-xs text-slate-500">{desc}</p>
      </div>
    </Link>
  );
}
