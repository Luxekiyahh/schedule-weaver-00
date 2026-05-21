import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  getBookingWorkspace,
  getBookingSlots,
  createBooking,
} from "@/lib/booking.functions";
import {
  ArrowLeft, ArrowRight, Calendar as CalendarIcon, Check, ChevronLeft, ChevronRight,
  Clock, Loader2, MapPin, Sparkles, User, Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { normalizeTheme, fontClass, cardRadius, layoutPadding, type ThemeConfig } from "@/lib/theme";

export const Route = createFileRoute("/booking/$slug")({
  component: BookingPage,
  head: ({ params }) => ({
    meta: [
      { title: `Book — ${params.slug}` },
      { name: "description", content: "Book an appointment online." },
    ],
  }),
});

type Service = {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price_cents: number;
  currency: string;
};
type Provider = { member_id: string; name: string };

const ANY = "__any__";

function money(cents: number, ccy = "USD") {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: ccy }).format(cents / 100);
}
function ymd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function fmtTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  const d = new Date(); d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function BookingPage() {
  const { slug } = Route.useParams();
  const loadWs = useServerFn(getBookingWorkspace);
  const loadSlots = useServerFn(getBookingSlots);
  const submit = useServerFn(createBooking);

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Awaited<ReturnType<typeof getBookingWorkspace>> | null>(null);

  const [step, setStep] = useState(1);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [providerId, setProviderId] = useState<string>(ANY);
  const [monthCursor, setMonthCursor] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slots, setSlots] = useState<{ time: string; member_id: string }[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<{ time: string; member_id: string } | null>(null);

  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", notes: "" });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ start_at: string } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await loadWs({ data: { slug } });
        setData(res);
      } catch (e: any) {
        toast.error(e.message ?? "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  const service = useMemo<Service | null>(
    () => data?.services.find((s) => s.id === serviceId) ?? null,
    [data, serviceId],
  );

  const eligibleProviders = useMemo<Provider[]>(() => {
    if (!data || !serviceId) return [];
    const memberIds = new Set(
      data.serviceProviders.filter((l) => l.service_id === serviceId).map((l) => l.member_id),
    );
    return data.providers.filter((p) => memberIds.has(p.member_id));
  }, [data, serviceId]);

  const targetMemberIds = useMemo(() => {
    if (providerId === ANY) return eligibleProviders.map((p) => p.member_id);
    return [providerId];
  }, [providerId, eligibleProviders]);

  // Load slots when date chosen
  useEffect(() => {
    if (!selectedDate || !service || !data || targetMemberIds.length === 0) return;
    setSlotsLoading(true);
    setSelectedSlot(null);
    loadSlots({
      data: {
        workspaceId: data.workspace!.id,
        memberIds: targetMemberIds,
        durationMinutes: service.duration_minutes,
        date: selectedDate,
      },
    })
      .then((r) => setSlots(r.slots))
      .catch((e) => toast.error(e.message))
      .finally(() => setSlotsLoading(false));
  }, [selectedDate, service?.id, providerId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/40">
        <div className="mx-auto max-w-2xl px-6 py-16 space-y-4">
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!data?.workspace) {
    return (
      <div className="min-h-screen grid place-items-center bg-gradient-to-br from-slate-50 to-indigo-50/40 px-6">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
            <MapPin className="h-7 w-7 text-slate-400" />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Workspace not found</h1>
          <p className="mt-2 text-sm text-slate-500">
            We couldn't find a booking page at <span className="font-mono text-slate-700">/{slug}</span>. Double-check the link or contact the business.
          </p>
          <Link to="/" className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700">
            <ArrowLeft className="h-4 w-4" /> Back to home
          </Link>
        </div>
      </div>
    );
  }

  const ws = data.workspace;
  const theme = normalizeTheme((ws as { theme_config?: unknown }).theme_config);
  const pad = layoutPadding(theme.layout_mode);
  const radius = cardRadius(theme.card_style);
  const font = fontClass(theme.font_family);
  const primary = theme.primary_color;

  const stepLabels = ["Service", "Provider", "Time", "Details"];

  return (
    <div className={`min-h-screen ${font}`} style={{ backgroundColor: theme.background_color }}>
      <div className={`mx-auto max-w-2xl px-6 ${pad.page}`}>
        {/* Header */}
        <header className="text-center">
          <div className="mx-auto mb-4 inline-flex items-center gap-1.5 rounded-full bg-white/80 backdrop-blur px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-slate-500 shadow-sm ring-1 ring-slate-200">
            <Sparkles className="h-3 w-3" style={{ color: primary }} /> Book online
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">{theme.hero_text}</h1>
          <p className="mt-2 text-sm text-slate-500">{ws.name}</p>
        </header>

        {/* Stepper */}
        {!done && (
          <div className="mt-8 flex items-center justify-center gap-2">
            {stepLabels.map((label, i) => {
              const n = i + 1;
              const active = step === n;
              const complete = step > n;
              return (
                <div key={label} className="flex items-center gap-2">
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ring-1 transition ${
                      complete
                        ? "bg-indigo-600 text-white ring-indigo-600"
                        : active
                        ? "bg-white text-slate-900 ring-slate-900"
                        : "bg-white text-slate-400 ring-slate-200"
                    }`}
                  >
                    {complete ? <Check className="h-3.5 w-3.5" /> : n}
                  </div>
                  <span className={`hidden text-xs font-medium sm:inline ${active ? "text-slate-900" : "text-slate-400"}`}>
                    {label}
                  </span>
                  {n < stepLabels.length && <div className="h-px w-6 bg-slate-200 sm:w-8" />}
                </div>
              );
            })}
          </div>
        )}

        {/* Confirmation */}
        {done ? (
          <div className="mt-10 overflow-hidden rounded-3xl bg-white p-10 text-center shadow-sm ring-1 ring-slate-200">
            <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-full bg-emerald-50 ring-1 ring-emerald-200">
              <Check className="h-7 w-7 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-semibold text-slate-900">You're booked!</h2>
            <p className="mt-2 text-sm text-slate-500">
              {new Date(done.start_at).toLocaleString([], {
                weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit",
              })}
            </p>
            <p className="mt-1 text-sm text-slate-500">A confirmation has been recorded for {form.email}.</p>
          </div>
        ) : (
          <div className="mt-8 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
            {/* STEP 1: Services */}
            {step === 1 && (
              <div className="p-6 sm:p-8">
                <h2 className="text-lg font-semibold text-slate-900">Choose a service</h2>
                {data.services.length === 0 ? (
                  <p className="mt-6 text-sm text-slate-500">No services available yet.</p>
                ) : (
                  <div className="mt-5 space-y-3">
                    {data.services.map((s) => {
                      const active = serviceId === s.id;
                      return (
                        <button
                          key={s.id}
                          onClick={() => { setServiceId(s.id); setProviderId(ANY); }}
                          className={`group flex w-full items-start gap-4 rounded-2xl border p-4 text-left transition ${
                            active
                              ? "border-slate-900 bg-slate-900/[0.02] shadow-sm"
                              : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex-1">
                            <div className="flex items-center justify-between gap-3">
                              <h3 className="font-medium text-slate-900">{s.name}</h3>
                              <span className="text-base font-semibold text-slate-900">
                                {money(s.price_cents, s.currency)}
                              </span>
                            </div>
                            {s.description && (
                              <p className="mt-1 text-sm text-slate-500 line-clamp-2">{s.description}</p>
                            )}
                            <div className="mt-2 inline-flex items-center gap-1 text-xs text-slate-500">
                              <Clock className="h-3 w-3" /> {s.duration_minutes} min
                            </div>
                          </div>
                          <div
                            className={`mt-1 grid h-5 w-5 place-items-center rounded-full ring-1 transition ${
                              active ? "bg-slate-900 ring-slate-900" : "ring-slate-300 group-hover:ring-slate-400"
                            }`}
                          >
                            {active && <Check className="h-3 w-3 text-white" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
                <div className="mt-6 flex justify-end">
                  <Button
                    disabled={!serviceId}
                    onClick={() => setStep(2)}
                    className="bg-slate-900 hover:bg-slate-800"
                  >
                    Continue <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 2: Provider */}
            {step === 2 && (
              <div className="p-6 sm:p-8">
                <h2 className="text-lg font-semibold text-slate-900">Choose a provider</h2>
                <div className="mt-5 space-y-3">
                  <ProviderRow
                    icon={<Users className="h-4 w-4" />}
                    name="Any available provider"
                    description="We'll match you with the first open slot."
                    active={providerId === ANY}
                    onClick={() => setProviderId(ANY)}
                  />
                  {eligibleProviders.length === 0 ? (
                    <p className="text-sm text-slate-500">No providers linked to this service yet.</p>
                  ) : (
                    eligibleProviders.map((p) => (
                      <ProviderRow
                        key={p.member_id}
                        icon={<User className="h-4 w-4" />}
                        name={p.name}
                        active={providerId === p.member_id}
                        onClick={() => setProviderId(p.member_id)}
                      />
                    ))
                  )}
                </div>
                <FooterNav onBack={() => setStep(1)} onNext={() => setStep(3)} nextDisabled={eligibleProviders.length === 0 && providerId === ANY} />
              </div>
            )}

            {/* STEP 3: Date & Time */}
            {step === 3 && (
              <div className="p-6 sm:p-8">
                <h2 className="text-lg font-semibold text-slate-900">Pick a date & time</h2>
                <MonthCalendar
                  cursor={monthCursor}
                  setCursor={setMonthCursor}
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                />
                <div className="mt-6">
                  {!selectedDate ? (
                    <p className="text-sm text-slate-500">Select a date to see open times.</p>
                  ) : slotsLoading ? (
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-9" />)}
                    </div>
                  ) : slots.length === 0 ? (
                    <p className="text-sm text-slate-500">No open times that day. Try another date.</p>
                  ) : (
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {slots.map((s) => {
                        const active = selectedSlot?.time === s.time && selectedSlot?.member_id === s.member_id;
                        return (
                          <button
                            key={`${s.time}-${s.member_id}`}
                            onClick={() => setSelectedSlot(s)}
                            className={`rounded-full px-3 py-2 text-sm font-medium ring-1 transition ${
                              active
                                ? "bg-slate-900 text-white ring-slate-900"
                                : "bg-white text-slate-700 ring-slate-200 hover:ring-slate-400"
                            }`}
                          >
                            {fmtTime(s.time)}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                <FooterNav onBack={() => setStep(2)} onNext={() => setStep(4)} nextDisabled={!selectedSlot} />
              </div>
            )}

            {/* STEP 4: Details */}
            {step === 4 && (
              <div className="p-6 sm:p-8">
                <h2 className="text-lg font-semibold text-slate-900">Your details</h2>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <Field label="First name">
                    <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
                  </Field>
                  <Field label="Last name">
                    <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
                  </Field>
                  <div className="sm:col-span-2">
                    <Field label="Email">
                      <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                    </Field>
                  </div>
                  <div className="sm:col-span-2">
                    <Field label="Notes (optional)">
                      <Textarea
                        rows={3}
                        value={form.notes}
                        onChange={(e) => setForm({ ...form, notes: e.target.value })}
                        placeholder="Anything we should know?"
                      />
                    </Field>
                  </div>
                </div>

                {/* Summary */}
                <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm ring-1 ring-slate-200">
                  <div className="flex justify-between"><span className="text-slate-500">Service</span><span className="font-medium text-slate-900">{service?.name}</span></div>
                  <div className="mt-1 flex justify-between"><span className="text-slate-500">When</span><span className="font-medium text-slate-900">{selectedDate && selectedSlot && new Date(`${selectedDate}T${selectedSlot.time}`).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span></div>
                  <div className="mt-1 flex justify-between"><span className="text-slate-500">Total</span><span className="font-semibold text-slate-900">{service && money(service.price_cents, service.currency)}</span></div>
                </div>

                <div className="mt-6 flex items-center justify-between">
                  <Button variant="ghost" onClick={() => setStep(3)} disabled={submitting}>
                    <ArrowLeft className="h-4 w-4" /> Back
                  </Button>
                  <Button
                    className="bg-slate-900 hover:bg-slate-800"
                    disabled={submitting || !form.firstName || !form.lastName || !form.email || !selectedSlot || !service}
                    onClick={async () => {
                      if (!service || !selectedSlot || !selectedDate || !data.workspace) return;
                      setSubmitting(true);
                      try {
                        const res = await submit({
                          data: {
                            workspaceId: data.workspace.id,
                            serviceId: service.id,
                            providerMemberId: selectedSlot.member_id,
                            date: selectedDate,
                            time: selectedSlot.time,
                            firstName: form.firstName,
                            lastName: form.lastName,
                            email: form.email,
                            notes: form.notes,
                          },
                        });
                        setDone({ start_at: res.start_at });
                      } catch (e: any) {
                        toast.error(e.message ?? "Could not complete booking");
                      } finally {
                        setSubmitting(false);
                      }
                    }}
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    Confirm booking
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        <p className="mt-8 text-center text-xs text-slate-400">Powered by your scheduling app</p>
      </div>
    </div>
  );
}

function FooterNav({ onBack, onNext, nextDisabled }: { onBack: () => void; onNext: () => void; nextDisabled?: boolean }) {
  return (
    <div className="mt-6 flex items-center justify-between">
      <Button variant="ghost" onClick={onBack}><ArrowLeft className="h-4 w-4" /> Back</Button>
      <Button onClick={onNext} disabled={nextDisabled} className="bg-slate-900 hover:bg-slate-800">
        Continue <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

function ProviderRow({ icon, name, description, active, onClick }: { icon: React.ReactNode; name: string; description?: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition ${
        active ? "border-slate-900 bg-slate-900/[0.02]" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
      }`}
    >
      <div className={`grid h-9 w-9 place-items-center rounded-full ${active ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600"}`}>
        {icon}
      </div>
      <div className="flex-1">
        <div className="text-sm font-medium text-slate-900">{name}</div>
        {description && <div className="text-xs text-slate-500">{description}</div>}
      </div>
      <div className={`grid h-5 w-5 place-items-center rounded-full ring-1 ${active ? "bg-slate-900 ring-slate-900" : "ring-slate-300"}`}>
        {active && <Check className="h-3 w-3 text-white" />}
      </div>
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</Label>
      {children}
    </div>
  );
}

function MonthCalendar({
  cursor, setCursor, selected, onSelect,
}: {
  cursor: Date; setCursor: (d: Date) => void; selected: string | null; onSelect: (d: string) => void;
}) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const monthName = cursor.toLocaleString([], { month: "long", year: "numeric" });
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const leading = first.getDay();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < leading; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));
  while (cells.length % 7 !== 0) cells.push(null);

  const minMonth = startOfMonth(today);
  const maxMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);

  return (
    <div className="mt-5 rounded-2xl border border-slate-200 p-4">
      <div className="mb-3 flex items-center justify-between">
        <button
          className="grid h-8 w-8 place-items-center rounded-full text-slate-500 hover:bg-slate-100 disabled:opacity-30"
          onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
          disabled={cursor <= minMonth}
        ><ChevronLeft className="h-4 w-4" /></button>
        <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
          <CalendarIcon className="h-4 w-4 text-slate-400" /> {monthName}
        </div>
        <button
          className="grid h-8 w-8 place-items-center rounded-full text-slate-500 hover:bg-slate-100 disabled:opacity-30"
          onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
          disabled={cursor >= maxMonth}
        ><ChevronRight className="h-4 w-4" /></button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium uppercase tracking-wider text-slate-400">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <div key={i}>{d}</div>)}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const iso = ymd(d);
          const isPast = d < today;
          const isSelected = selected === iso;
          const isToday = ymd(d) === ymd(today);
          return (
            <button
              key={i}
              disabled={isPast}
              onClick={() => onSelect(iso)}
              className={`h-9 rounded-lg text-sm transition ${
                isSelected
                  ? "bg-slate-900 text-white"
                  : isPast
                  ? "text-slate-300"
                  : isToday
                  ? "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
