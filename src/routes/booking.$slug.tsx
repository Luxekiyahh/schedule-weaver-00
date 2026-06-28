import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getBookingWorkspace, getBookingSlots, createBooking } from "@/lib/booking.functions";
import {
  ArrowLeft,
  ArrowRight,
  Calendar as CalendarIcon,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  MapPin,
  Sparkles,
  User,
  Users,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { normalizeTheme, fontClass, cardRadius, layoutPadding } from "@/lib/theme";

export const Route = createFileRoute("/booking/$slug")({
  component: BookingPage,
  head: ({ params }) => ({
    meta: [{ title: `Book — ${params.slug}` }, { name: "description", content: "Book an appointment online." }],
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

// ----------------------------------------------------
// ALLURING DOLLS LUXURY BLACK & RED MOCK DATA
// ----------------------------------------------------
const ALLURING_DOLLS_MOCK = {
  workspace: {
    id: "alluring-dolls-ws-id",
    name: "Alluring Dolls",
    slug: "alluringdolls",
    theme_config: {
      primary_color: "#D32F2F", // Deep Crimson Red
      secondary_color: "#1A1A1A", // Sleek Onyx Card Backing
      background_color: "#0A0A0A", // Pure Obsidian Dark Background
      text_color: "#FFFFFF", // Crisp White Text
      hero_text: "Alluring Dolls",
      font_family: "serif", // Elegant luxury typography style
      card_style: "rounded-2xl",
      layout_mode: "comfortable",
    },
  },
  providers: [{ member_id: "p1", name: "Alluring Dolls" }],
  serviceProviders: [] as { service_id: string; member_id: string }[], // Populated below dynamically
  services: [
    {
      id: "ad-s1",
      name: "Quick Weave",
      description: "Must provide own hair (Sensual or Empire brand preferred). Includes basic styling.",
      duration_minutes: 120,
      price_cents: 12000,
      currency: "USD",
    },
    {
      id: "ad-s2",
      name: "Bobs / Blunt Cut",
      description: "Includes basic styling.",
      duration_minutes: 120,
      price_cents: 12000,
      currency: "USD",
    },
    {
      id: "ad-s3",
      name: "Frontal / Closure Quick Weave",
      description: "Must provide own hair. Includes basic styling.",
      duration_minutes: 120,
      price_cents: 14000,
      currency: "USD",
    },
    {
      id: "ad-s4",
      name: "Half Up Half Down",
      description: "Includes basic styling.",
      duration_minutes: 120,
      price_cents: 13500,
      currency: "USD",
    },
    {
      id: "ad-s5",
      name: "Half Braids Half Bond In",
      description: "Includes basic styling.",
      duration_minutes: 120,
      price_cents: 16500,
      currency: "USD",
    },
    {
      id: "ad-s6",
      name: "Classic Ponytail",
      description: "Includes basic styling.",
      duration_minutes: 90,
      price_cents: 10000,
      currency: "USD",
    },
    {
      id: "ad-s7",
      name: "2 Ponytails",
      description: "Includes basic styling.",
      duration_minutes: 90,
      price_cents: 12000,
      currency: "USD",
    },
    {
      id: "ad-s8",
      name: "Traditional Sew-In",
      description: "Must provide own hair (Sensual or Empire brand preferred). Includes basic styling.",
      duration_minutes: 180,
      price_cents: 15000,
      currency: "USD",
    },
    {
      id: "ad-s9",
      name: "Frontal / Closure Sew-In",
      description: "Includes basic styling.",
      duration_minutes: 180,
      price_cents: 17000,
      currency: "USD",
    },
    {
      id: "ad-s10",
      name: "Half Braids Half Sewn In",
      description: "Includes basic styling.",
      duration_minutes: 180,
      price_cents: 19000,
      currency: "USD",
    },
    {
      id: "ad-s11",
      name: "Frontal Wig Install",
      description: "Includes basic styling.",
      duration_minutes: 90,
      price_cents: 13000,
      currency: "USD",
    },
    {
      id: "ad-s12",
      name: "Closure Wig Install",
      description: "Includes basic styling.",
      duration_minutes: 90,
      price_cents: 10000,
      currency: "USD",
    },
    {
      id: "ad-s13",
      name: "Custom Curls Add-on",
      description: "Thermal styling extension layer.",
      duration_minutes: 45,
      price_cents: 4500,
      currency: "USD",
    },
    {
      id: "ad-s14",
      name: "Crimps Add-on",
      description: "Thermal styling extension layer.",
      duration_minutes: 45,
      price_cents: 4500,
      currency: "USD",
    },
    {
      id: "ad-s15",
      name: "X-Small Plaits / Braids",
      description:
        "Ages 14 & up. Hair included (60 inch). Colors: 1B, 1, 2, 4. Extra lengths: Thigh +$50 | Knee +$125.",
      duration_minutes: 240,
      price_cents: 30000,
      currency: "USD",
    },
    {
      id: "ad-s16",
      name: "Small Plaits / Braids",
      description:
        "Ages 14 & up. Hair included (60 inch). Colors: 1B, 1, 2, 4. Extra lengths: Thigh +$50 | Knee +$125.",
      duration_minutes: 210,
      price_cents: 27500,
      currency: "USD",
    },
    {
      id: "ad-s17",
      name: "Smedium Plaits / Braids",
      description:
        "Ages 14 & up. Hair included (60 inch). Colors: 1B, 1, 2, 4. Extra lengths: Thigh +$50 | Knee +$125.",
      duration_minutes: 180,
      price_cents: 22500,
      currency: "USD",
    },
    {
      id: "ad-s18",
      name: "Medium Plaits / Braids",
      description:
        "Ages 14 & up. Hair included (60 inch). Colors: 1B, 1, 2, 4. Extra lengths: Thigh +$50 | Knee +$125.",
      duration_minutes: 150,
      price_cents: 17500,
      currency: "USD",
    },
    {
      id: "ad-s19",
      name: "2-4 Braids",
      description: "Extra length variables: Butt/Thigh +$35 | Knee +$50.",
      duration_minutes: 120,
      price_cents: 7000,
      currency: "USD",
    },
    {
      id: "ad-s20",
      name: "6-8 Braids",
      description: "Extra length variables: Butt/Thigh +$35 | Knee +$50.",
      duration_minutes: 120,
      price_cents: 9000,
      currency: "USD",
    },
    {
      id: "ad-s21",
      name: "10-14 Braids",
      description: "Extra length variables: Butt/Thigh +$35 | Knee +$50.",
      duration_minutes: 180,
      price_cents: 15000,
      currency: "USD",
    },
    {
      id: "ad-s22",
      name: "20 Braids",
      description: "Extra length variables: Butt/Thigh +$35 | Knee +$50.",
      duration_minutes: 210,
      price_cents: 18500,
      currency: "USD",
    },
    {
      id: "ad-s23",
      name: "25+ Braids",
      description: "Extra length variables: Butt/Thigh +$35 | Knee +$50.",
      duration_minutes: 240,
      price_cents: 22500,
      currency: "USD",
    },
  ],
};

// Wire service links automatically
ALLURING_DOLLS_MOCK.serviceProviders = ALLURING_DOLLS_MOCK.services.map((s) => ({
  service_id: s.id,
  member_id: "p1",
}));

function money(cents: number, ccy = "USD") {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: ccy }).format(cents / 100);
}
function ymd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function fmtTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function BookingPage() {
  const { slug } = Route.useParams();
  const isAlluringDolls = slug?.toLowerCase() === "alluringdolls";

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
        if (isAlluringDolls) {
          setData(ALLURING_DOLLS_MOCK as any);
        } else {
          const res = await loadWs({ data: { slug } });
          setData(res);
        }
      } catch (e: any) {
        toast.error(e.message ?? "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, [slug, isAlluringDolls]);

  // Compute workspace view reference safely
  const activeData = isAlluringDolls ? (ALLURING_DOLLS_MOCK as any) : data;

  const service = useMemo<Service | null>(
    () => activeData?.services.find((s: any) => s.id === serviceId) ?? null,
    [activeData, serviceId],
  );

  const eligibleProviders = useMemo<Provider[]>(() => {
    if (!activeData || !serviceId) return [];
    const memberIds = new Set(
      activeData.serviceProviders.filter((l: any) => l.service_id === serviceId).map((l: any) => l.member_id),
    );
    return activeData.providers.filter((p: any) => memberIds.has(p.member_id));
  }, [activeData, serviceId]);

  const targetMemberIds = useMemo(() => {
    if (providerId === ANY) return eligibleProviders.map((p) => p.member_id);
    return [providerId];
  }, [providerId, eligibleProviders]);

  // Load slots when date chosen
  useEffect(() => {
    if (!selectedDate || !service || !activeData || targetMemberIds.length === 0) return;
    setSlotsLoading(true);
    setSelectedSlot(null);
    loadSlots({
      data: {
        workspaceId: activeData.workspace!.id,
        memberIds: targetMemberIds,
        durationMinutes: service.duration_minutes,
        date: selectedDate,
      },
    })
      .then((r) => setSlots(r.slots))
      .catch((e) => toast.error(e.message))
      .finally(() => setSlotsLoading(false));
  }, [selectedDate, service?.id, providerId, activeData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="mx-auto max-w-2xl px-6 py-16 space-y-4 w-full">
          <Skeleton className="h-8 w-1/2 bg-zinc-800" />
          <Skeleton className="h-4 w-1/3 bg-zinc-800" />
          <Skeleton className="h-64 w-full rounded-2xl bg-zinc-800" />
        </div>
      </div>
    );
  }

  if (!activeData?.workspace) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-50 px-6">
        <div className="max-w-md text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Workspace not found</h1>
          <Link to="/" className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600">
            <ArrowLeft className="h-4 w-4" /> Back to home
          </Link>
        </div>
      </div>
    );
  }

  const ws = activeData.workspace;
  const theme = normalizeTheme((ws as { theme_config?: unknown }).theme_config);
  const pad = layoutPadding(theme.layout_mode);
  const radius = cardRadius(theme.card_style);
  const font = fontClass(theme.font_family);
  const primary = theme.primary_color;

  const stepLabels = ["Service", "Provider", "Time", "Details"];

  return (
    <div
      className={`min-h-screen ${font}`}
      style={{ backgroundColor: theme.background_color, color: isAlluringDolls ? "#FFFFFF" : undefined }}
    >
      <div className={`mx-auto max-w-2xl px-6 ${pad.page}`}>
        {/* Header */}
        <header className="text-center">
          <div
            className="mx-auto mb-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium uppercase tracking-wider shadow-sm ring-1"
            style={{
              backgroundColor: isAlluringDolls ? "#1A1A1A" : "rgba(255,255,255,0.8)",
              color: isAlluringDolls ? "#FFFFFF" : "#64748B",
              borderColor: isAlluringDolls ? "#333333" : "#E2E8F0",
            }}
          >
            <Sparkles className="h-3 w-3" style={{ color: primary }} /> Book online
          </div>
          <h1
            className={`text-3xl font-semibold tracking-wide sm:text-4xl ${isAlluringDolls ? "text-white" : "text-slate-900"}`}
          >
            {ws.name}
          </h1>
          <p className={`mt-2 text-sm ${isAlluringDolls ? "text-zinc-400" : "text-slate-500"}`}>
            {isAlluringDolls ? "📍 Belle Glade, FL | 🕒 Mon-Sat: 10am - 6pm" : ws.name}
          </p>
        </header>

        {/* ❌ NO KIDS EXCLUSIVE SALON BANNER (No background container layout) */}
        {isAlluringDolls && (
          <div className="mt-6 text-center text-red-500 font-extrabold tracking-widest text-lg uppercase animate-pulse">
            ‼️ NO KIDS ALLOWED ‼️
          </div>
        )}

        {/* Custom Salon Rule Overview Cards Layer */}
        {isAlluringDolls && step === 1 && (
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="bg-[#1A1A1A] border border-zinc-800 p-4 rounded-xl space-y-1">
              <span className="font-bold tracking-wider uppercase text-[#D32F2F] text-[10px] block">
                Contact & Policy
              </span>
              <p className="text-zinc-300">
                💬 Text Only: <span className="text-white font-medium">(561) 975-8519</span>
              </p>
              <p className="text-zinc-400">
                💵 $25 non-refundable deposit via card. Remaining balance paid in{" "}
                <span className="text-emerald-400 font-bold">CASH ONLY!</span>
              </p>
            </div>
            <div className="bg-[#1A1A1A] border border-zinc-800 p-4 rounded-xl space-y-1">
              <span className="font-bold tracking-wider uppercase text-[#D32F2F] text-[10px] block">Arrival Prep</span>
              <p className="text-zinc-300">💨 Must arrive with hair completely blown out, dry & product-free.</p>
              <p className="text-zinc-400">
                ⏰ 15-min late grace period. Appointments are immediately canceled after 15 mins.
              </p>
            </div>
          </div>
        )}

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
                        ? "text-white"
                        : active
                          ? isAlluringDolls
                            ? "bg-zinc-800 text-white ring-white"
                            : "bg-white text-slate-900 ring-slate-900"
                          : isAlluringDolls
                            ? "bg-zinc-900 text-zinc-600 ring-zinc-800"
                            : "bg-white text-slate-400 ring-slate-200"
                    }`}
                    style={complete ? { backgroundColor: primary, borderColor: primary } : undefined}
                  >
                    {complete ? <Check className="h-3.5 w-3.5" /> : n}
                  </div>
                  <span
                    className={`hidden text-xs font-medium sm:inline ${active ? (isAlluringDolls ? "text-white" : "text-slate-900") : "text-slate-400"}`}
                  >
                    {label}
                  </span>
                  {n < stepLabels.length && (
                    <div className={`h-px w-6 sm:w-8 ${isAlluringDolls ? "bg-zinc-800" : "bg-slate-200"}`} />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Main Interface Content Engine */}
        {done ? (
          <div
            className={`mt-10 overflow-hidden ${radius} p-10 text-center shadow-sm ring-1`}
            style={{
              backgroundColor: isAlluringDolls ? "#1A1A1A" : "#FFFFFF",
              borderColor: isAlluringDolls ? "#222222" : "#E2E8F0",
            }}
          >
            <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-full bg-emerald-950 ring-1 ring-emerald-500">
              <Check className="h-7 w-7 text-emerald-400" />
            </div>
            <h2 className={`text-2xl font-semibold ${isAlluringDolls ? "text-white" : "text-slate-900"}`}>
              You're booked!
            </h2>
            <p className="mt-2 text-sm text-zinc-400">
              {new Date(done.start_at).toLocaleString([], {
                weekday: "long",
                month: "long",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
                timeZone: "UTC",
              })}
            </p>
            <p className="mt-1 text-sm text-zinc-400">A confirmation record was sent, and details are locked in.</p>
          </div>
        ) : (
          <div
            className={`mt-8 overflow-hidden ${radius} shadow-sm ring-1`}
            style={{
              backgroundColor: isAlluringDolls ? "#1A1A1A" : "#FFFFFF",
              borderColor: isAlluringDolls ? "#222222" : "#E2E8F0",
            }}
          >
            {/* STEP 1: Services */}
            {step === 1 && (
              <div className="p-6 sm:p-8">
                <div className="flex justify-between items-baseline mb-4 border-b border-zinc-800 pb-2">
                  <h2 className={`text-lg font-semibold ${isAlluringDolls ? "text-white" : "text-slate-900"}`}>
                    Select Hairstyling Service
                  </h2>
                  {isAlluringDolls && (
                    <span className="text-[10px] uppercase text-zinc-500 tracking-wider">*Starting prices listed</span>
                  )}
                </div>

                {activeData.services.length === 0 ? (
                  <p className="mt-6 text-sm text-slate-500">No services available yet.</p>
                ) : (
                  <div className="mt-5 space-y-3 max-h-[400px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-zinc-800">
                    {activeData.services.map((s: any) => {
                      const active = serviceId === s.id;
                      return (
                        <button
                          key={s.id}
                          onClick={() => {
                            setServiceId(s.id);
                            setProviderId(ANY);
                          }}
                          className={`group flex w-full items-start gap-4 rounded-2xl border p-4 text-left transition ${
                            active
                              ? isAlluringDolls
                                ? "border-[#D32F2F] bg-[#D32F2F]/[0.04]"
                                : "border-slate-900 bg-slate-900/[0.02]"
                              : isAlluringDolls
                                ? "border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/50"
                                : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex-1">
                            <div className="flex items-center justify-between gap-3">
                              <h3 className={`font-medium ${isAlluringDolls ? "text-zinc-100" : "text-slate-900"}`}>
                                {s.name}
                              </h3>
                              <span
                                className={`text-base font-semibold ${isAlluringDolls ? "text-[#D32F2F]" : "text-slate-900"}`}
                              >
                                {money(s.price_cents, s.currency)}
                              </span>
                            </div>
                            {s.description && (
                              <p className="mt-1 text-xs text-zinc-400 line-clamp-2">{s.description}</p>
                            )}
                            <div className="mt-2 inline-flex items-center gap-1 text-[11px] text-zinc-500">
                              <Clock className="h-3 w-3" /> {s.duration_minutes} min
                            </div>
                          </div>
                          <div
                            className={`mt-1 grid h-5 w-5 place-items-center rounded-full ring-1 transition ${
                              active
                                ? "bg-[#D32F2F] ring-[#D32F2F]"
                                : isAlluringDolls
                                  ? "ring-zinc-700"
                                  : "ring-slate-300"
                            }`}
                          >
                            {active && <Check className="h-3 w-3 text-white" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {isAlluringDolls && (
                  <div className="mt-4 p-3 bg-zinc-950 border border-zinc-800 rounded-xl flex gap-2 items-start text-[11px] text-zinc-400">
                    <Info className="h-3.5 w-3.5 text-[#D32F2F] shrink-0 mt-0.5" />
                    <p>
                      Styles are final once confirmed. For custom cornrows/plaits, please see hair brand notes listed
                      under details inside description boxes.
                    </p>
                  </div>
                )}

                <div className="mt-6 flex justify-end">
                  <Button
                    disabled={!serviceId}
                    onClick={() => setStep(2)}
                    style={{ backgroundColor: primary }}
                    className="text-white hover:opacity-90"
                  >
                    Continue <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 2: Provider */}
            {step === 2 && (
              <div className="p-6 sm:p-8">
                <h2 className={`text-lg font-semibold ${isAlluringDolls ? "text-white" : "text-slate-900"}`}>
                  Choose a provider
                </h2>
                <div className="mt-5 space-y-3">
                  <button
                    onClick={() => setProviderId(ANY)}
                    className={`flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition ${
                      providerId === ANY
                        ? isAlluringDolls
                          ? "border-[#D32F2F] bg-[#D32F2F]/[0.04]"
                          : "border-slate-900 bg-slate-900/[0.02]"
                        : isAlluringDolls
                          ? "border-zinc-800 hover:border-zinc-700"
                          : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div
                      className={`grid h-9 w-9 place-items-center rounded-full ${isAlluringDolls ? "bg-zinc-950 text-white" : "bg-slate-100 text-slate-600"}`}
                    >
                      <Users className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <div className={`text-sm font-medium ${isAlluringDolls ? "text-white" : "text-slate-900"}`}>
                        Any available provider
                      </div>
                      <div className="text-xs text-zinc-400">We'll match you with the first open slot.</div>
                    </div>
                    <div
                      className={`grid h-5 w-5 place-items-center rounded-full ring-1 ${providerId === ANY ? "bg-[#D32F2F] ring-[#D32F2F]" : "ring-zinc-700"}`}
                    >
                      {providerId === ANY && <Check className="h-3 w-3 text-white" />}
                    </div>
                  </button>

                  {eligibleProviders.length === 0 ? (
                    <p className="text-sm text-zinc-500">No specific providers linked. Please select Any available.</p>
                  ) : (
                    eligibleProviders.map((p) => (
                      <button
                        key={p.member_id}
                        onClick={() => setProviderId(p.member_id)}
                        className={`flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition ${
                          providerId === p.member_id
                            ? isAlluringDolls
                              ? "border-[#D32F2F] bg-[#D32F2F]/[0.04]"
                              : "border-slate-900 bg-slate-900/[0.02]"
                            : isAlluringDolls
                              ? "border-zinc-800 hover:border-zinc-700"
                              : "border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <div
                          className={`grid h-9 w-9 place-items-center rounded-full ${isAlluringDolls ? "bg-zinc-950 text-white" : "bg-slate-100 text-slate-600"}`}
                        >
                          <User className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <div className={`text-sm font-medium ${isAlluringDolls ? "text-white" : "text-slate-900"}`}>
                            {p.name}
                          </div>
                        </div>
                        <div
                          className={`grid h-5 w-5 place-items-center rounded-full ring-1 ${providerId === p.member_id ? "bg-[#D32F2F] ring-[#D32F2F]" : "ring-zinc-700"}`}
                        >
                          {providerId === p.member_id && <Check className="h-3 w-3 text-white" />}
                        </div>
                      </button>
                    ))
                  )}
                </div>
                <FooterNav
                  primary={primary}
                  isAlluringDolls={isAlluringDolls}
                  onBack={() => setStep(1)}
                  onNext={() => setStep(3)}
                  nextDisabled={eligibleProviders.length === 0 && providerId === ANY}
                />
              </div>
            )}

            {/* STEP 3: Date & Time */}
            {step === 3 && (
              <div className="p-6 sm:p-8">
                <h2 className={`text-lg font-semibold ${isAlluringDolls ? "text-white" : "text-slate-900"}`}>
                  Pick a date & time
                </h2>
                <MonthCalendar
                  cursor={monthCursor}
                  setCursor={setMonthCursor}
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  isAlluringDolls={isAlluringDolls}
                />
                <div className="mt-6">
                  {!selectedDate ? (
                    <p className="text-sm text-zinc-500">Select a date to see open times.</p>
                  ) : slotsLoading ? (
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {Array.from({ length: 8 }).map((_, i) => (
                        <Skeleton key={i} className="h-9 bg-zinc-800" />
                      ))}
                    </div>
                  ) : slots.length === 0 ? (
                    <p className="text-sm text-zinc-400">No open times that day. Try another date.</p>
                  ) : (
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {slots.map((s) => {
                        const active = selectedSlot?.time === s.time && selectedSlot?.member_id === s.member_id;
                        return (
                          <button
                            key={`${s.time}-${s.member_id}`}
                            onClick={() => setSelectedSlot(s)}
                            style={active ? { backgroundColor: primary, borderColor: primary } : undefined}
                            className={`rounded-full px-3 py-2 text-sm font-medium ring-1 transition ${
                              active
                                ? "text-white ring-transparent"
                                : isAlluringDolls
                                  ? "bg-zinc-950 text-zinc-300 ring-zinc-800 hover:ring-zinc-600"
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
                <FooterNav
                  primary={primary}
                  isAlluringDolls={isAlluringDolls}
                  onBack={() => setStep(2)}
                  onNext={() => setStep(4)}
                  nextDisabled={!selectedSlot}
                />
              </div>
            )}

            {/* STEP 4: Details */}
            {step === 4 && (
              <div className="p-6 sm:p-8">
                <h2 className={`text-lg font-semibold ${isAlluringDolls ? "text-white" : "text-slate-900"}`}>
                  Your details
                </h2>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <Field label="First name" isAlluringDolls={isAlluringDolls}>
                    <Input
                      className={isAlluringDolls ? "bg-zinc-950 border-zinc-800 text-white" : ""}
                      value={form.firstName}
                      onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    />
                  </Field>
                  <Field label="Last name" isAlluringDolls={isAlluringDolls}>
                    <Input
                      className={isAlluringDolls ? "bg-zinc-950 border-zinc-800 text-white" : ""}
                      value={form.lastName}
                      onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    />
                  </Field>
                  <div className="sm:col-span-2">
                    <Field label="Email" isAlluringDolls={isAlluringDolls}>
                      <Input
                        className={isAlluringDolls ? "bg-zinc-950 border-zinc-800 text-white" : ""}
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                      />
                    </Field>
                  </div>
                  <div className="sm:col-span-2">
                    <Field label="Notes (optional)" isAlluringDolls={isAlluringDolls}>
                      <Textarea
                        className={isAlluringDolls ? "bg-zinc-950 border-zinc-800 text-white" : ""}
                        rows={3}
                        value={form.notes}
                        onChange={(e) => setForm({ ...form, notes: e.target.value })}
                        placeholder="Anything we should know?"
                      />
                    </Field>
                  </div>
                </div>

                {/* Summary Panel */}
                <div
                  className="mt-6 rounded-2xl p-4 text-sm ring-1"
                  style={{
                    backgroundColor: isAlluringDolls ? "#0A0A0A" : "#F8FAFC",
                    borderColor: isAlluringDolls ? "#222222" : "#E2E8F0",
                  }}
                >
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Service</span>
                    <span className={`font-medium ${isAlluringDolls ? "text-white" : "text-slate-900"}`}>
                      {service?.name}
                    </span>
                  </div>
                  <div className="mt-1 flex justify-between">
                    <span className="text-zinc-500">When</span>
                    <span className={`font-medium ${isAlluringDolls ? "text-white" : "text-slate-900"}`}>
                      {selectedDate &&
                        selectedSlot &&
                        new Date(`${selectedDate}T${selectedSlot.time}`).toLocaleString([], {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                    </span>
                  </div>
                  <div className="mt-1 flex justify-between">
                    <span className="text-zinc-500">Total Due</span>
                    <span className={`font-semibold ${isAlluringDolls ? "text-[#D32F2F]" : "text-slate-900"}`}>
                      {service && money(service.price_cents, service.currency)}
                    </span>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between">
                  <Button
                    variant="ghost"
                    className={isAlluringDolls ? "text-zinc-400 hover:text-white" : ""}
                    onClick={() => setStep(3)}
                    disabled={submitting}
                  >
                    <ArrowLeft className="h-4 w-4" /> Back
                  </Button>
                  <Button
                    style={{ backgroundColor: primary }}
                    className="text-white hover:opacity-90"
                    disabled={
                      submitting || !form.firstName || !form.lastName || !form.email || !selectedSlot || !service
                    }
                    onClick={async () => {
                      if (!service || !selectedSlot || !selectedDate || !activeData.workspace) return;
                      setSubmitting(true);
                      try {
                        const res = await submit({
                          data: {
                            workspaceId: activeData.workspace.id,
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

        <p className="mt-8 text-center text-xs text-zinc-500">Powered by PROCschedule</p>
      </div>
    </div>
  );
}

function FooterNav({
  onBack,
  onNext,
  nextDisabled,
  primary,
  isAlluringDolls,
}: {
  onBack: () => void;
  onNext: () => void;
  nextDisabled?: boolean;
  primary: string;
  isAlluringDolls: boolean;
}) {
  return (
    <div className="mt-6 flex items-center justify-between">
      <Button variant="ghost" className={isAlluringDolls ? "text-zinc-400 hover:text-white" : ""} onClick={onBack}>
        <ArrowLeft className="h-4 w-4" /> Back
      </Button>
      <Button
        onClick={onNext}
        disabled={nextDisabled}
        style={{ backgroundColor: primary }}
        className="text-white hover:opacity-90"
      >
        Continue <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

function Field({
  label,
  children,
  isAlluringDolls,
}: {
  label: string;
  children: React.ReactNode;
  isAlluringDolls?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label
        className={`text-xs font-medium uppercase tracking-wider ${isAlluringDolls ? "text-zinc-500" : "text-slate-500"}`}
      >
        {label}
      </Label>
      {children}
    </div>
  );
}

function MonthCalendar({
  cursor,
  setCursor,
  selected,
  onSelect,
  isAlluringDolls,
}: {
  cursor: Date;
  setCursor: (d: Date) => void;
  selected: string | null;
  onSelect: (d: string) => void;
  isAlluringDolls: boolean;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
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
    <div
      className={`mt-5 rounded-2xl border p-4 ${isAlluringDolls ? "border-zinc-800 bg-zinc-950/40" : "border-slate-200"}`}
    >
      <div className="mb-3 flex items-center justify-between">
        <button
          className={`grid h-8 w-8 place-items-center rounded-full disabled:opacity-30 ${isAlluringDolls ? "text-zinc-400 hover:bg-zinc-900" : "text-slate-500 hover:bg-slate-100"}`}
          onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
          disabled={cursor <= minMonth}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div
          className={`flex items-center gap-2 text-sm font-medium ${isAlluringDolls ? "text-white" : "text-slate-900"}`}
        >
          <CalendarIcon className="h-4 w-4 text-zinc-500" /> {monthName}
        </div>
        <button
          className={`grid h-8 w-8 place-items-center rounded-full disabled:opacity-30 ${isAlluringDolls ? "text-zinc-400 hover:bg-zinc-900" : "text-slate-500 hover:bg-slate-100"}`}
          onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
          disabled={cursor >= maxMonth}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium uppercase tracking-wider text-zinc-500">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div key={i}>{d}</div>
        ))}
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
                  ? "bg-[#D32F2F] text-white"
                  : isPast
                    ? "text-zinc-700"
                    : isToday
                      ? isAlluringDolls
                        ? "bg-red-950 text-red-400 font-bold"
                        : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                      : isAlluringDolls
                        ? "text-zinc-300 hover:bg-zinc-900"
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
