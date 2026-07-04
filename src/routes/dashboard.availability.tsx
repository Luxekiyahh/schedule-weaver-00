import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, CalendarClock, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/availability")({
  component: AvailabilityPage,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/onboarding" });
  },
  head: () => ({ meta: [{ title: "Availability — Dashboard" }] }),
});

type DayState = { active: boolean; start: string; end: string };

const DAYS: { dow: number; label: string }[] = [
  { dow: 1, label: "Monday" },
  { dow: 2, label: "Tuesday" },
  { dow: 3, label: "Wednesday" },
  { dow: 4, label: "Thursday" },
  { dow: 5, label: "Friday" },
  { dow: 6, label: "Saturday" },
  { dow: 0, label: "Sunday" },
];

const DEFAULT: DayState = { active: false, start: "09:00", end: "17:00" };

function AvailabilityPage() {
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [memberId, setMemberId] = useState<string | null>(null);
  const [state, setState] = useState<Record<number, DayState>>(() =>
    Object.fromEntries(DAYS.map((d) => [d.dow, { ...DEFAULT }])),
  );
  const [initial, setInitial] = useState<Record<number, DayState>>(() =>
    Object.fromEntries(DAYS.map((d) => [d.dow, { ...DEFAULT }])),
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data: mem } = await supabase
        .from("workspace_members")
        .select("id, workspace_id")
        .eq("user_id", u.user.id).eq("is_active", true).limit(1).maybeSingle();
      if (!mem) { setLoading(false); return; }
      setMemberId(mem.id);
      setWorkspaceId(mem.workspace_id);

      const { data: avail, error } = await supabase
        .from("provider_availability")
        .select("day_of_week, start_time, end_time")
        .eq("workspace_id", mem.workspace_id)
        .eq("member_id", mem.id);
      if (error) toast.error(error.message);

      const next: Record<number, DayState> = Object.fromEntries(DAYS.map((d) => [d.dow, { ...DEFAULT }]));
      (avail ?? []).forEach((row: any) => {
        next[row.day_of_week] = {
          active: true,
          start: (row.start_time ?? "09:00:00").slice(0, 5),
          end: (row.end_time ?? "17:00:00").slice(0, 5),
        };
      });
      setState(next);
      setInitial(JSON.parse(JSON.stringify(next)));
      setLoading(false);
    })();
  }, []);

  const dirty = useMemo(() => JSON.stringify(state) !== JSON.stringify(initial), [state, initial]);

  const update = (dow: number, patch: Partial<DayState>) =>
    setState((prev) => ({ ...prev, [dow]: { ...prev[dow], ...patch } }));

  const save = async () => {
    if (!workspaceId || !memberId) return;
    // Validate
    for (const { dow, label } of DAYS) {
      const s = state[dow];
      if (s.active && s.start >= s.end) {
        return toast.error(`${label}: end time must be after start time`);
      }
    }
    setSaving(true);
    try {
      // Replace-strategy: delete all rows for this member, insert active ones
      const { error: delErr } = await supabase
        .from("provider_availability")
        .delete()
        .eq("workspace_id", workspaceId)
        .eq("member_id", memberId);
      if (delErr) throw delErr;

      const rows = DAYS.filter(({ dow }) => state[dow].active).map(({ dow }) => ({
        workspace_id: workspaceId,
        member_id: memberId,
        day_of_week: dow,
        start_time: `${state[dow].start}:00`,
        end_time: `${state[dow].end}:00`,
      }));
      if (rows.length) {
        const { error: insErr } = await supabase.from("provider_availability").insert(rows);
        if (insErr) throw insErr;
      }
      setInitial(JSON.parse(JSON.stringify(state)));
      toast.success("Availability saved");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen grid place-items-center bg-slate-50"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-28">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Link to="/dashboard/home" className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-900">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to home
            </Link>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Weekly availability</h1>
            <p className="mt-1 text-sm text-slate-500">
              Set the recurring hours when clients can book you. Use exceptions on the calendar for one-off changes.
            </p>
          </div>
          <div className="hidden sm:block">
            <Button onClick={save} disabled={!dirty || saving} className="bg-slate-900 hover:bg-slate-800">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save changes
            </Button>
          </div>
        </div>

        <div className="mt-8 overflow-hidden rounded-2xl border bg-white shadow-sm">
          {DAYS.map(({ dow, label }, idx) => {
            const s = state[dow];
            return (
              <div
                key={dow}
                className={`flex flex-wrap items-center gap-4 px-5 py-4 ${idx !== DAYS.length - 1 ? "border-b" : ""} ${s.active ? "" : "bg-slate-50/40"}`}
              >
                <div className="flex min-w-[160px] items-center gap-3">
                  <Switch checked={s.active} onCheckedChange={(v) => update(dow, { active: v })} />
                  <span className={`text-sm font-medium ${s.active ? "text-slate-900" : "text-slate-400"}`}>{label}</span>
                </div>
                {s.active ? (
                  <div className="flex flex-1 flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs uppercase tracking-wider text-slate-400">Start</span>
                      <Input
                        type="time"
                        value={s.start}
                        onChange={(e) => update(dow, { start: e.target.value })}
                        className="w-[120px]"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs uppercase tracking-wider text-slate-400">End</span>
                      <Input
                        type="time"
                        value={s.end}
                        onChange={(e) => update(dow, { end: e.target.value })}
                        className="w-[120px]"
                      />
                    </div>
                  </div>
                ) : (
                  <span className="text-xs text-slate-400">Unavailable</span>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex items-start gap-3 rounded-2xl border bg-[#141414]/5 p-4 text-sm text-[#141414]">
          <CalendarClock className="mt-0.5 h-4 w-4 shrink-0" />
          <p>These hours repeat every week. Need to block a specific date or add extra hours? Use availability exceptions on the calendar.</p>
        </div>
      </div>

      {/* Floating save bar (mobile + sticky reminder when dirty) */}
      {dirty && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-white/90 backdrop-blur">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-6 py-3">
            <p className="text-xs text-slate-600">You have unsaved changes.</p>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={() => setState(JSON.parse(JSON.stringify(initial)))}
                disabled={saving}
              >
                Discard
              </Button>
              <Button onClick={save} disabled={saving} className="bg-slate-900 hover:bg-slate-800">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save changes
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
