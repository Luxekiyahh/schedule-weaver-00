import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import {
  LogOut, Plus, ChevronLeft, ChevronRight, Calendar as CalendarIcon,
  Users, DollarSign, Clock, Loader2, UserCircle2, CalendarX, Trash2, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";


export const Route = createFileRoute("/dashboard/calendar")({
  component: Dashboard,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/onboarding" });
  },
  head: () => ({ meta: [{ title: "Calendar — Dashboard" }] }),
});

type ViewMode = "day" | "week" | "month";
type Role = "owner" | "admin" | "staff" | "client";
type Status = "pending" | "confirmed" | "cancelled" | "completed" | "no_show";

type Member = {
  id: string;
  user_id: string;
  role: Role;
  profile?: { full_name: string | null; email: string | null; avatar_url: string | null } | null;
};

type Service = {
  id: string;
  name: string;
  duration_minutes: number;
  price_cents: number;
  currency: string;
  color: string | null;
};

type Customer = { id: string; full_name: string; email: string | null };

type ScheduleException = { id: string; block_date: string; label: string; start_time: string | null; end_time: string | null };


type Appointment = {
  id: string;
  workspace_id: string;
  service_id: string;
  provider_id: string;
  customer_id: string;
  start_at: string;
  end_at: string;
  status: Status;
  notes: string | null;
  service?: Service | null;
  customer?: Customer | null;
};

const HOUR_START = 8;
const HOUR_END = 20;
const HOURS = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i);
const SLOT_PX = 56; // px per hour

function startOfDay(d: Date) { const x = new Date(d); x.setHours(0,0,0,0); return x; }
function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate()+n); return x; }
function startOfWeek(d: Date) { const x = startOfDay(d); const day = x.getDay(); return addDays(x, -day); }
function fmtTime(d: Date) { return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }); }
function fmtDate(d: Date) { return d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" }); }
function money(cents: number, ccy = "USD") {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: ccy }).format(cents/100);
}

const STATUS_STYLES: Record<Status, string> = {
  pending: "bg-amber-50 border-l-4 border-amber-400 text-amber-900",
  confirmed: "bg-[#141414]/5 border-l-4 border-[#141414] text-[#141414]",
  cancelled: "bg-slate-100 border-l-4 border-slate-300 text-slate-500 line-through",
  completed: "bg-emerald-50 border-l-4 border-emerald-500 text-emerald-900",
  no_show: "bg-rose-50 border-l-4 border-rose-500 text-rose-900",
};

function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [workspaceName, setWorkspaceName] = useState("");
  const [myMemberId, setMyMemberId] = useState<string | null>(null);
  const [myRole, setMyRole] = useState<Role>("staff");
  const [members, setMembers] = useState<Member[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  const [view, setView] = useState<ViewMode>("week");
  const [cursor, setCursor] = useState<Date>(startOfDay(new Date()));
  const [selectedProvider, setSelectedProvider] = useState<string>("all"); // member id or "all"
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);
  const [showCancelled, setShowCancelled] = useState(false);
  const [newOpen, setNewOpen] = useState(false);

  const navigate = useNavigate();
  const [exceptionsOpen, setExceptionsOpen] = useState(false);
  const [exceptions, setExceptions] = useState<ScheduleException[]>([]);
  const [newBlockDate, setNewBlockDate] = useState("");
  const [newBlockLabel, setNewBlockLabel] = useState("");
  const [blockAllDay, setBlockAllDay] = useState(true);
  const [newBlockStart, setNewBlockStart] = useState("09:00");
  const [newBlockEnd, setNewBlockEnd] = useState("17:00");
  const [savingBlock, setSavingBlock] = useState(false);

  const isAdmin = myRole === "owner" || myRole === "admin";


  // Bootstrap: workspace + role
  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data: mem } = await supabase
        .from("workspace_members")
        .select("id, workspace_id, role, workspaces(name)")
        .eq("user_id", u.user.id)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();
      if (!mem) { setLoading(false); return; }
      setMyMemberId(mem.id);
      setMyRole(mem.role as Role);
      setWorkspaceId(mem.workspace_id);
      const ws = (mem as unknown as { workspaces?: { name?: string } | null }).workspaces;
      setWorkspaceName(ws?.name ?? "Workspace");
      if (mem.role === "staff") setSelectedProvider(mem.id);
      setLoading(false);
    })();
  }, []);

  // Load members, services, customers
  useEffect(() => {
    if (!workspaceId) return;
    (async () => {
      const [{ data: mems }, { data: svcs }, { data: custs }] = await Promise.all([
        supabase
          .from("workspace_members")
          .select("id, user_id, role, profiles:profiles!workspace_members_user_id_fkey(full_name, email, avatar_url)")
          .eq("workspace_id", workspaceId)
          .eq("is_active", true)
          .in("role", ["owner", "admin", "staff"]),
        supabase.from("services").select("*").eq("workspace_id", workspaceId).eq("is_active", true),
        supabase.from("customers").select("id, full_name, email").eq("workspace_id", workspaceId),
      ]);
      // Fallback if FK alias not detected — fetch profiles separately
      let memList: Member[] = [];
      if (mems && mems.length) {
        const userIds = mems.map((m: any) => m.user_id);
        const { data: profs } = await supabase
          .from("profiles").select("id, full_name, email, avatar_url").in("id", userIds);
        const pmap = new Map((profs ?? []).map((p) => [p.id, p]));
        memList = mems.map((m: any) => ({
          id: m.id, user_id: m.user_id, role: m.role,
          profile: pmap.get(m.user_id) ?? null,
        }));
      }
      setMembers(memList);
      setServices((svcs ?? []) as Service[]);
      setCustomers((custs ?? []) as Customer[]);
    })();
  }, [workspaceId]);

  // Date range from view + cursor
  const [rangeStart, rangeEnd] = useMemo(() => {
    if (view === "day") return [startOfDay(cursor), addDays(startOfDay(cursor), 1)];
    if (view === "week") { const s = startOfWeek(cursor); return [s, addDays(s, 7)]; }
    const s = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const e = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    return [s, e];
  }, [view, cursor]);

  const loadAppointments = useCallback(async () => {
    if (!workspaceId) return;
    let q = supabase
      .from("appointments")
      .select("*, service:services(*), customer:customers(id, full_name, email)")
      .eq("workspace_id", workspaceId)
      .gte("start_at", rangeStart.toISOString())
      .lt("start_at", rangeEnd.toISOString())
      .order("start_at", { ascending: true });
    if (myRole === "staff" && myMemberId) {
      q = q.eq("provider_id", myMemberId);
    } else if (selectedProvider !== "all") {
      q = q.eq("provider_id", selectedProvider);
    }
    const { data, error } = await q;
    if (error) { toast.error(error.message); return; }
    setAppointments((data ?? []) as Appointment[]);
  }, [workspaceId, rangeStart, rangeEnd, myRole, myMemberId, selectedProvider]);

  useEffect(() => { loadAppointments(); }, [loadAppointments]);

  // Schedule exceptions (workspace-wide date blocks)
  const loadExceptions = useCallback(async () => {
    if (!workspaceId) return;
    const { data, error } = await supabase
      .from("schedule_exceptions")
      .select("id, block_date, label, start_time, end_time")
      .eq("workspace_id", workspaceId)
      .order("block_date", { ascending: true });
    if (error) { toast.error(error.message); return; }
    setExceptions((data ?? []) as ScheduleException[]);
  }, [workspaceId]);

  useEffect(() => { loadExceptions(); }, [loadExceptions]);

  const addException = async () => {
    if (!workspaceId) return;
    if (!newBlockDate || !newBlockLabel.trim()) {
      toast.error("Pick a date and enter a label");
      return;
    }
    if (!blockAllDay) {
      if (!newBlockStart || !newBlockEnd) {
        toast.error("Pick a start and end time");
        return;
      }
      if (newBlockStart >= newBlockEnd) {
        toast.error("End time must be after start time");
        return;
      }
    }
    setSavingBlock(true);
    const { data: u } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("schedule_exceptions")
      .insert({
        workspace_id: workspaceId,
        block_date: newBlockDate,
        label: newBlockLabel.trim(),
        start_time: blockAllDay ? null : newBlockStart,
        end_time: blockAllDay ? null : newBlockEnd,
        created_by: u.user?.id ?? null,
      })
      .select("id, block_date, label, start_time, end_time")
      .single();
    setSavingBlock(false);
    if (error) { toast.error(error.message); return; }
    setExceptions((prev) => [...prev, data as ScheduleException].sort((a, b) => a.block_date.localeCompare(b.block_date)));
    setNewBlockDate("");
    setNewBlockLabel("");
    toast.success(blockAllDay ? "Date block enforced" : "Hour block enforced");
  };

  const removeException = async (id: string) => {
    const { error } = await supabase.from("schedule_exceptions").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setExceptions((prev) => prev.filter((e) => e.id !== id));
    toast.success("Block removed");
  };


  // Metrics (admin only)
  const metrics = useMemo(() => {
    const today = startOfDay(new Date()).getTime();
    const tomorrow = addDays(new Date(today), 1).getTime();
    const todays = appointments.filter((a) => {
      const t = new Date(a.start_at).getTime();
      return t >= today && t < tomorrow;
    });
    const revenue = appointments
      .filter((a) => a.status === "confirmed" || a.status === "completed")
      .reduce((s, a) => s + (a.service?.price_cents ?? 0), 0);
    const pending = appointments.filter((a) => a.status === "pending").length;
    return { today: todays.length, revenue, pending };
  }, [appointments]);

  const updateStatus = async (id: string, status: Status) => {
    const patch: any = { status };
    if (status === "cancelled") {
      patch.cancelled_at = new Date().toISOString();
      patch.cancelled_by = myMemberId;
    }
    const { error } = await supabase.from("appointments").update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(`Marked ${status}`);
    setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
    setSelectedAppt((p) => (p && p.id === id ? { ...p, status } : p));
  };

  const deleteAppointment = async (id: string) => {
    if (!confirm("Delete this appointment permanently? This cannot be undone.")) return;
    const { error } = await supabase.from("appointments").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Appointment deleted");
    setAppointments((prev) => prev.filter((a) => a.id !== id));
    setSelectedAppt(null);
  };

  // Cancelled appointments are hidden from the grid by default so cancelling
  // visibly removes them; the "Show cancelled" toggle brings them back.
  const visibleAppointments = useMemo(
    () => (showCancelled ? appointments : appointments.filter((a) => a.status !== "cancelled")),
    [appointments, showCancelled],
  );

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-50">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!workspaceId) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-50">
        <div className="text-center">
          <p className="text-slate-600">No workspace found.</p>
          <Button className="mt-3" onClick={() => (window.location.href = "/onboarding")}>
            Set up workspace
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-slate-900 text-white">
              <CalendarIcon className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-400">Workspace</p>
              <h1 className="text-sm font-semibold text-slate-900">{workspaceName}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => setNewOpen(true)} className="bg-slate-900 hover:bg-slate-800">
              <Plus className="h-4 w-4" /> New Appointment
            </Button>
            <Button
              variant="ghost" size="sm"
              onClick={async () => { await supabase.auth.signOut(); window.location.href = "/"; }}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1400px] px-6 py-6">
        {/* Back to Dashboard + control panel */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={() => navigate({ to: "/dashboard/home" })}
            className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 transition hover:text-slate-900"
          >
            <ChevronLeft className="h-4 w-4" /> Back to Dashboard
          </button>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate({ to: "/dashboard/staff" })}>
              <Users className="h-4 w-4" /> Add Providers
            </Button>
            <Button variant="outline" onClick={() => setExceptionsOpen(true)}>
              <CalendarX className="h-4 w-4" /> Schedule Exceptions
            </Button>
          </div>
        </div>

        {/* Metrics */}

        {isAdmin && (
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            <MetricCard icon={<Clock className="h-4 w-4" />} label="Appointments today" value={metrics.today.toString()} />
            <MetricCard icon={<DollarSign className="h-4 w-4" />} label="Confirmed revenue" value={money(metrics.revenue)} />
            <MetricCard icon={<Users className="h-4 w-4" />} label="Pending approvals" value={metrics.pending.toString()} accent={metrics.pending > 0} />
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
          {/* Sidebar */}
          {isAdmin && (
            <aside className="space-y-2">
              <p className="px-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Providers</p>
              <button
                onClick={() => setSelectedProvider("all")}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${
                  selectedProvider === "all" ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                <Users className="h-4 w-4" /> All providers
              </button>
              {members.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSelectedProvider(m.id)}
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${
                    selectedProvider === m.id ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <UserCircle2 className="h-4 w-4 shrink-0" />
                  <span className="truncate">{m.profile?.full_name ?? m.profile?.email ?? "Member"}</span>
                  <span className={`ml-auto text-[10px] uppercase ${selectedProvider === m.id ? "text-slate-300" : "text-slate-400"}`}>
                    {m.role}
                  </span>
                </button>
              ))}
            </aside>
          )}

          {/* Calendar */}
          <section className="rounded-2xl border bg-white shadow-sm">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon"
                  onClick={() => setCursor(view === "month"
                    ? new Date(cursor.getFullYear(), cursor.getMonth()-1, 1)
                    : addDays(cursor, view === "day" ? -1 : -7))}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setCursor(startOfDay(new Date()))}>Today</Button>
                <Button variant="ghost" size="icon"
                  onClick={() => setCursor(view === "month"
                    ? new Date(cursor.getFullYear(), cursor.getMonth()+1, 1)
                    : addDays(cursor, view === "day" ? 1 : 7))}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <h2 className="ml-3 text-base font-semibold text-slate-900">
                  {view === "month"
                    ? cursor.toLocaleDateString([], { month: "long", year: "numeric" })
                    : view === "week"
                      ? `${fmtDate(rangeStart)} – ${fmtDate(addDays(rangeEnd, -1))}`
                      : fmtDate(cursor)}
                </h2>
              </div>
              <div className="inline-flex rounded-lg border bg-slate-50 p-1">
                {(["day","week","month"] as ViewMode[]).map((v) => (
                  <button key={v} onClick={() => setView(v)}
                    className={`rounded-md px-3 py-1 text-xs font-medium capitalize transition ${
                      view === v ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
                    }`}>
                    {v}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-2 flex justify-end">
              <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-slate-500">
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 rounded border-slate-300"
                  checked={showCancelled}
                  onChange={(e) => setShowCancelled(e.target.checked)}
                />
                Show cancelled
              </label>
            </div>

            {view === "month"
              ? <MonthView cursor={cursor} appointments={visibleAppointments} onSelect={setSelectedAppt} />
              : <TimeGridView
                  view={view} rangeStart={rangeStart}
                  appointments={visibleAppointments} onSelect={setSelectedAppt}
                />}
          </section>
        </div>
      </div>

      {/* Appointment detail */}
      <ApptDialog
        appt={selectedAppt}
        onClose={() => setSelectedAppt(null)}
        onStatus={(s) => selectedAppt && updateStatus(selectedAppt.id, s)}
        onDelete={() => selectedAppt && deleteAppointment(selectedAppt.id)}
      />

      {/* New appointment */}
      <NewApptSheet
        open={newOpen}
        onOpenChange={setNewOpen}
        workspaceId={workspaceId}
        members={members}
        services={services}
        customers={customers}
        myMemberId={myMemberId}
        myRole={myRole}
        defaultProvider={selectedProvider !== "all" ? selectedProvider : myMemberId ?? null}
        onCreated={() => { loadAppointments(); setNewOpen(false); }}
        onCustomerAdded={(c) => setCustomers((p) => [c, ...p])}
      />

      {/* Schedule Exceptions overlay modal */}
      <AnimatePresence>
        {exceptionsOpen && (
          <motion.div
            className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setExceptionsOpen(false)}
          >
            <motion.div
              className="w-full max-w-md rounded-2xl border bg-white p-6 shadow-xl"
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ type: "spring", stiffness: 300, damping: 26 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-slate-900 text-white">
                    <CalendarX className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">Schedule Exceptions</h3>
                    <p className="text-xs text-slate-500">Block off dates like holidays.</p>
                  </div>
                </div>
                <button
                  onClick={() => setExceptionsOpen(false)}
                  className="rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="block-date">Date</Label>
                  <Input
                    id="block-date"
                    type="date"
                    value={newBlockDate}
                    onChange={(e) => setNewBlockDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="block-label">Label</Label>
                  <Input
                    id="block-label"
                    placeholder="Holiday Close"
                    value={newBlockLabel}
                    onChange={(e) => setNewBlockLabel(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2 rounded-lg border bg-slate-50 p-1">
                  <button
                    type="button"
                    onClick={() => setBlockAllDay(true)}
                    className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition ${blockAllDay ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
                  >
                    All day
                  </button>
                  <button
                    type="button"
                    onClick={() => setBlockAllDay(false)}
                    className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition ${!blockAllDay ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
                  >
                    Hours
                  </button>
                </div>
                {!blockAllDay && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="block-start">From</Label>
                      <Input
                        id="block-start"
                        type="time"
                        value={newBlockStart}
                        onChange={(e) => setNewBlockStart(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="block-end">To</Label>
                      <Input
                        id="block-end"
                        type="time"
                        value={newBlockEnd}
                        onChange={(e) => setNewBlockEnd(e.target.value)}
                      />
                    </div>
                  </div>
                )}
                <Button
                  onClick={addException}
                  disabled={savingBlock}
                  className="w-full bg-slate-900 hover:bg-slate-800"
                >
                  {savingBlock ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  {blockAllDay ? "Enforce Date Block" : "Enforce Hour Block"}
                </Button>
              </div>

              <div className="mt-5">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Active blocks
                </p>
                {exceptions.length === 0 ? (
                  <p className="rounded-lg border border-dashed py-6 text-center text-sm text-slate-400">
                    No date blocks yet.
                  </p>
                ) : (
                  <ul className="max-h-56 space-y-2 overflow-auto">
                    {exceptions.map((ex) => (
                      <li
                        key={ex.id}
                        className="flex items-center gap-3 rounded-lg border bg-slate-50 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-900">{ex.label}</p>
                          <p className="text-xs text-slate-500">
                            {new Date(ex.block_date + "T00:00:00").toLocaleDateString([], {
                              weekday: "short", month: "short", day: "numeric", year: "numeric",
                            })}
                            {ex.start_time && ex.end_time
                              ? ` · ${ex.start_time.slice(0, 5)}–${ex.end_time.slice(0, 5)}`
                              : " · All day"}
                          </p>
                        </div>
                        <button
                          onClick={() => removeException(ex.id)}
                          className="ml-auto rounded-md p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                          aria-label="Remove block"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>

  );
}

function MetricCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border bg-white p-5 shadow-sm ${accent ? "ring-1 ring-amber-200" : ""}`}>
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-slate-500">
        {icon} {label}
      </div>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function TimeGridView({
  view, rangeStart, appointments, onSelect,
}: { view: "day" | "week"; rangeStart: Date; appointments: Appointment[]; onSelect: (a: Appointment) => void; }) {
  const days = view === "day" ? [rangeStart] : Array.from({ length: 7 }, (_, i) => addDays(rangeStart, i));
  const today = startOfDay(new Date()).getTime();

  return (
    <div className="overflow-auto">
      <div className="min-w-[720px]">
        {/* Day headers */}
        <div className="grid border-b" style={{ gridTemplateColumns: `64px repeat(${days.length}, 1fr)` }}>
          <div />
          {days.map((d) => {
            const isToday = startOfDay(d).getTime() === today;
            return (
              <div key={d.toISOString()} className={`px-3 py-2 text-center ${isToday ? "bg-[#141414]/5" : ""}`}>
                <p className="text-[10px] uppercase tracking-wider text-slate-400">
                  {d.toLocaleDateString([], { weekday: "short" })}
                </p>
                <p className={`text-lg font-semibold ${isToday ? "text-[#141414]" : "text-slate-900"}`}>
                  {d.getDate()}
                </p>
              </div>
            );
          })}
        </div>
        {/* Grid */}
        <div className="relative grid" style={{ gridTemplateColumns: `64px repeat(${days.length}, 1fr)` }}>
          {/* Hour labels */}
          <div>
            {HOURS.map((h) => (
              <div key={h} className="h-14 border-b pr-2 text-right text-[10px] text-slate-400">
                <span className="relative -top-2">{h === 12 ? "12 PM" : h > 12 ? `${h-12} PM` : `${h} AM`}</span>
              </div>
            ))}
          </div>
          {days.map((d) => (
            <DayColumn key={d.toISOString()} day={d} appointments={appointments} onSelect={onSelect} />
          ))}
        </div>
      </div>
    </div>
  );
}

function DayColumn({ day, appointments, onSelect }: { day: Date; appointments: Appointment[]; onSelect: (a: Appointment) => void; }) {
  const dayStart = startOfDay(day).getTime();
  const dayEnd = dayStart + 24 * 3600 * 1000;
  const dayAppts = appointments.filter((a) => {
    const s = new Date(a.start_at).getTime();
    return s >= dayStart && s < dayEnd;
  });

  return (
    <div className="relative border-l">
      {HOURS.map((h) => <div key={h} className="h-14 border-b" />)}
      {dayAppts.map((a) => {
        const start = new Date(a.start_at);
        const end = new Date(a.end_at);
        const startMin = start.getHours() * 60 + start.getMinutes() - HOUR_START * 60;
        const durMin = Math.max(30, (end.getTime() - start.getTime()) / 60000);
        const top = (startMin / 60) * SLOT_PX;
        const height = (durMin / 60) * SLOT_PX - 4;
        if (top < 0 || top > (HOUR_END - HOUR_START) * SLOT_PX) return null;
        return (
          <button
            key={a.id}
            onClick={() => onSelect(a)}
            className={`absolute left-1 right-1 overflow-hidden rounded-md px-2 py-1 text-left text-xs shadow-sm transition hover:shadow-md ${STATUS_STYLES[a.status]}`}
            style={{ top, height }}
          >
            <p className="font-semibold truncate">{a.customer?.full_name ?? "Client"}</p>
            <p className="truncate opacity-80">{a.service?.name}</p>
            <p className="opacity-60">{fmtTime(start)}</p>
          </button>
        );
      })}
    </div>
  );
}

function MonthView({ cursor, appointments, onSelect }: { cursor: Date; appointments: Appointment[]; onSelect: (a: Appointment) => void; }) {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const gridStart = startOfWeek(first);
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const byDay = new Map<string, Appointment[]>();
  appointments.forEach((a) => {
    const k = startOfDay(new Date(a.start_at)).toDateString();
    const arr = byDay.get(k) ?? [];
    arr.push(a); byDay.set(k, arr);
  });
  const today = startOfDay(new Date()).toDateString();

  return (
    <div>
      <div className="grid grid-cols-7 border-b text-center text-[10px] uppercase tracking-wider text-slate-400">
        {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => <div key={d} className="py-2">{d}</div>)}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((d) => {
          const inMonth = d.getMonth() === cursor.getMonth();
          const items = byDay.get(d.toDateString()) ?? [];
          const isToday = d.toDateString() === today;
          return (
            <div key={d.toISOString()} className={`min-h-[110px] border-b border-l p-1.5 ${inMonth ? "" : "bg-slate-50/60"}`}>
              <div className={`mb-1 text-right text-xs ${isToday ? "font-bold text-[#141414]" : "text-slate-500"}`}>
                {d.getDate()}
              </div>
              <div className="space-y-1">
                {items.slice(0, 3).map((a) => (
                  <button key={a.id} onClick={() => onSelect(a)}
                    className={`block w-full truncate rounded px-1.5 py-0.5 text-left text-[11px] ${STATUS_STYLES[a.status]}`}>
                    {fmtTime(new Date(a.start_at))} {a.customer?.full_name ?? "Client"}
                  </button>
                ))}
                {items.length > 3 && (
                  <p className="px-1 text-[10px] text-slate-400">+{items.length - 3} more</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ApptDialog({ appt, onClose, onStatus, onDelete }: { appt: Appointment | null; onClose: () => void; onStatus: (s: Status) => void; onDelete: () => void; }) {
  return (
    <Dialog open={!!appt} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        {appt && (
          <>
            <DialogHeader>
              <DialogTitle>{appt.service?.name ?? "Appointment"}</DialogTitle>
              <DialogDescription>
                {new Date(appt.start_at).toLocaleString([], { dateStyle: "full", timeStyle: "short" })}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 text-sm">
              <Row label="Client" value={appt.customer?.full_name ?? "—"} />
              <Row label="Email" value={appt.customer?.email ?? "—"} />
              <Row label="Duration" value={`${appt.service?.duration_minutes ?? 0} min`} />
              <Row label="Price" value={appt.service ? money(appt.service.price_cents, appt.service.currency) : "—"} />
              <Row label="Time" value={`${fmtTime(new Date(appt.start_at))} – ${fmtTime(new Date(appt.end_at))}`} />
              {appt.notes && <Row label="Notes" value={appt.notes} />}
              <div className="pt-2">
                <Label className="mb-2 block text-xs uppercase tracking-wider text-slate-500">Status</Label>
                <Select value={appt.status} onValueChange={(v) => onStatus(v as Status)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="no_show">No-show</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="border-t pt-3">
                <Button variant="outline" onClick={onDelete}
                  className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700">
                  <Trash2 className="mr-1.5 h-4 w-4" /> Delete appointment
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b pb-2">
      <span className="text-xs uppercase tracking-wider text-slate-400">{label}</span>
      <span className="text-right text-slate-900">{value}</span>
    </div>
  );
}

function NewApptSheet({
  open, onOpenChange, workspaceId, members, services, customers, myMemberId, myRole,
  defaultProvider, onCreated, onCustomerAdded,
}: {
  open: boolean; onOpenChange: (o: boolean) => void;
  workspaceId: string; members: Member[]; services: Service[]; customers: Customer[];
  myMemberId: string | null; myRole: Role;
  defaultProvider: string | null;
  onCreated: () => void;
  onCustomerAdded: (c: Customer) => void;
}) {
  const [providerId, setProviderId] = useState<string>(defaultProvider ?? "");
  const [serviceId, setServiceId] = useState<string>("");
  const [customerId, setCustomerId] = useState<string>("");
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState<string>("09:00");
  const [search, setSearch] = useState("");
  const [newClient, setNewClient] = useState(false);
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [providerServices, setProviderServices] = useState<string[] | null>(null);

  useEffect(() => { if (open) setProviderId(defaultProvider ?? ""); }, [open, defaultProvider]);

  // Load services bound to selected provider
  useEffect(() => {
    if (!providerId) { setProviderServices(null); return; }
    (async () => {
      const { data } = await supabase
        .from("service_providers").select("service_id")
        .eq("workspace_id", workspaceId).eq("member_id", providerId);
      setProviderServices((data ?? []).map((r: any) => r.service_id));
    })();
  }, [providerId, workspaceId]);

  const availableServices = providerServices
    ? services.filter((s) => providerServices.includes(s.id))
    : services;

  const filteredCustomers = customers.filter((c) =>
    c.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (c.email ?? "").toLowerCase().includes(search.toLowerCase())
  ).slice(0, 8);

  const canSubmit = providerId && serviceId && date && time && (newClient ? clientName.trim() : customerId);

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      let custId = customerId;
      if (newClient) {
        const { data, error } = await supabase
          .from("customers")
          .insert({ workspace_id: workspaceId, full_name: clientName.trim(), email: clientEmail.trim() || null })
          .select("id, full_name, email")
          .single();
        if (error) throw error;
        custId = data.id;
        onCustomerAdded(data as Customer);
      }
      const svc = services.find((s) => s.id === serviceId);
      if (!svc) throw new Error("Service not found");
      const start = new Date(`${date}T${time}:00`);
      const end = new Date(start.getTime() + svc.duration_minutes * 60000);
      const { error } = await supabase.from("appointments").insert({
        workspace_id: workspaceId,
        service_id: serviceId,
        provider_id: providerId,
        customer_id: custId,
        start_at: start.toISOString(),
        end_at: end.toISOString(),
        status: "confirmed",
      });
      if (error) throw error;
      toast.success("Appointment booked");
      // reset
      setServiceId(""); setCustomerId(""); setNewClient(false);
      setClientName(""); setClientEmail(""); setSearch("");
      onCreated();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to book");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>New appointment</SheetTitle>
          <SheetDescription>Book a client manually.</SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-4 px-4 pb-6">
          {(myRole === "owner" || myRole === "admin") && (
            <div>
              <Label className="mb-1.5 block">Provider</Label>
              <Select value={providerId} onValueChange={setProviderId}>
                <SelectTrigger><SelectValue placeholder="Select provider" /></SelectTrigger>
                <SelectContent>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.profile?.full_name ?? m.profile?.email ?? "Member"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label className="mb-1.5 block">Service</Label>
            <Select value={serviceId} onValueChange={setServiceId}>
              <SelectTrigger><SelectValue placeholder={availableServices.length ? "Select service" : "No services for provider"} /></SelectTrigger>
              <SelectContent>
                {availableServices.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} · {s.duration_minutes}min · {money(s.price_cents, s.currency)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1.5 block">Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <Label className="mb-1.5 block">Start time</Label>
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
          </div>

          <div className="rounded-lg border p-3">
            <div className="mb-2 flex items-center justify-between">
              <Label>Client</Label>
              <button
                type="button"
                onClick={() => setNewClient((v) => !v)}
                className="text-xs font-medium text-[#141414] hover:text-[#141414]"
              >
                {newClient ? "← Pick existing" : "+ Create new"}
              </button>
            </div>
            {newClient ? (
              <div className="space-y-2">
                <Input placeholder="Full name" value={clientName} onChange={(e) => setClientName(e.target.value)} />
                <Input placeholder="Email (optional)" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} />
              </div>
            ) : (
              <div className="space-y-2">
                <Input placeholder="Search clients…" value={search} onChange={(e) => setSearch(e.target.value)} />
                <div className="max-h-40 overflow-y-auto rounded-md border bg-slate-50">
                  {filteredCustomers.length === 0 && (
                    <p className="p-3 text-xs text-slate-400">No matches. Create a new client.</p>
                  )}
                  {filteredCustomers.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCustomerId(c.id)}
                      className={`flex w-full justify-between border-b px-3 py-2 text-left text-sm last:border-b-0 hover:bg-white ${
                        customerId === c.id ? "bg-white font-semibold" : ""
                      }`}
                    >
                      <span>{c.full_name}</span>
                      <span className="text-xs text-slate-400">{c.email}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Button onClick={submit} disabled={!canSubmit || submitting} className="w-full bg-slate-900 hover:bg-slate-800">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Book appointment"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
