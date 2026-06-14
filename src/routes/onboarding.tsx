import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  DollarSign,
  Loader2,
  Lock,
  Mail,
  Plus,
  Sparkles,
  Trash2,
  User,
  X,
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { checkSlugAvailable } from "@/lib/onboarding.functions";
import { TENANT_ROOT_DOMAIN } from "@/lib/subdomain";

export const Route = createFileRoute("/onboarding")({
  component: OnboardingWizard,
  head: () => ({
    meta: [
      { title: "Get started — Onboarding" },
      {
        name: "description",
        content:
          "Set up your scheduling workspace in four quick steps: account, business, services, and availability.",
      },
    ],
  }),
});

type StepId = 0 | 1 | 2 | 3;

const STEPS = [
  { id: 0, label: "Account", icon: User },
  { id: 1, label: "Workspace", icon: Briefcase },
  { id: 2, label: "Services", icon: Sparkles },
  { id: 3, label: "Availability", icon: Calendar },
] as const;

const DAYS = [
  { dow: 1, label: "Monday" },
  { dow: 2, label: "Tuesday" },
  { dow: 3, label: "Wednesday" },
  { dow: 4, label: "Thursday" },
  { dow: 5, label: "Friday" },
  { dow: 6, label: "Saturday" },
  { dow: 0, label: "Sunday" },
] as const;

type ServiceDraft = {
  id: string;
  name: string;
  duration: number;
  priceDollars: string;
};

type DayDraft = {
  dow: number;
  active: boolean;
  start: string;
  end: string;
};

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function OnboardingWizard() {
  const navigate = useNavigate();
  const [step, setStep] = useState<StepId>(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [submitting, setSubmitting] = useState(false);
  const [topError, setTopError] = useState<string | null>(null);
  const [finalizing, setFinalizing] = useState(false);

  // Step 1
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Step 2
  const [bizName, setBizName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [slugStatus, setSlugStatus] = useState<
    "idle" | "checking" | "available" | "taken" | "invalid"
  >("idle");

  // Step 3
  const [services, setServices] = useState<ServiceDraft[]>([
    {
      id: crypto.randomUUID(),
      name: "60-Minute Initial Consultation",
      duration: 60,
      priceDollars: "120.00",
    },
  ]);

  // Step 4
  const [days, setDays] = useState<DayDraft[]>(
    DAYS.map((d) => ({
      dow: d.dow,
      active: d.dow >= 1 && d.dow <= 5,
      start: "09:00",
      end: "17:00",
    })),
  );

  // Session state
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [memberId, setMemberId] = useState<string | null>(null);

  const checkSlug = useServerFn(checkSlugAvailable);

  // Auto-derive slug from business name
  useEffect(() => {
    if (!slugTouched) setSlug(slugify(bizName));
  }, [bizName, slugTouched]);

  // Debounced slug availability check
  const slugDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (step !== 1) return;
    if (slugDebounce.current) clearTimeout(slugDebounce.current);
    if (!slug) {
      setSlugStatus("idle");
      return;
    }
    if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(slug) || slug.length < 2) {
      setSlugStatus("invalid");
      return;
    }
    setSlugStatus("checking");
    slugDebounce.current = setTimeout(async () => {
      try {
        const res = await checkSlug({
          data: {
            slug,
            excludeWorkspaceId: workspaceId ?? undefined,
          },
        });
        setSlugStatus(res.available ? "available" : "taken");
      } catch {
        setSlugStatus("idle");
      }
    }, 350);
    return () => {
      if (slugDebounce.current) clearTimeout(slugDebounce.current);
    };
  }, [slug, step, workspaceId, checkSlug]);

  const canNext = useMemo(() => {
    if (submitting) return false;
    if (step === 0) {
      return (
        firstName.trim().length >= 1 &&
        lastName.trim().length >= 1 &&
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) &&
        password.length >= 8
      );
    }
    if (step === 1) {
      return bizName.trim().length >= 2 && slugStatus === "available";
    }
    if (step === 2) {
      return services.every(
        (s) =>
          s.name.trim().length >= 1 &&
          s.duration > 0 &&
          !Number.isNaN(parseFloat(s.priceDollars)),
      );
    }
    if (step === 3) {
      const actives = days.filter((d) => d.active);
      return actives.length >= 1 && actives.every((d) => d.start < d.end);
    }
    return false;
  }, [step, submitting, firstName, lastName, email, password, bizName, slugStatus, services, days]);

  async function handleStep0() {
    setTopError(null);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/onboarding`,
        data: { full_name: `${firstName.trim()} ${lastName.trim()}`.trim() },
      },
    });
    if (error) throw new Error(error.message);
    if (!data.session) {
      throw new Error(
        "Account created but no active session was returned. Please log in.",
      );
    }

    // Ensure profile reflects the entered name (the signup trigger uses metadata
    // but we update explicitly in case the user edited fields).
    await supabase
      .from("profiles")
      .update({
        full_name: `${firstName.trim()} ${lastName.trim()}`.trim(),
      })
      .eq("id", data.user!.id);

    // Trigger auto-created the solo workspace + owner membership. Fetch them.
    const { data: ws, error: wsErr } = await supabase
      .from("workspaces")
      .select("id, slug, name")
      .eq("owner_id", data.user!.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (wsErr || !ws) throw new Error(wsErr?.message ?? "Workspace not provisioned.");
    setWorkspaceId(ws.id);

    const { data: mem, error: memErr } = await supabase
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", ws.id)
      .eq("user_id", data.user!.id)
      .maybeSingle();
    if (memErr || !mem) throw new Error(memErr?.message ?? "Membership not provisioned.");
    setMemberId(mem.id);

    // Seed step 2 with the auto-generated slug/name as a starting point.
    if (!bizName) setBizName(ws.name ?? "");
  }

  async function handleStep1() {
    if (!workspaceId) throw new Error("Missing workspace.");
    const { error } = await supabase
      .from("workspaces")
      .update({
        name: bizName.trim(),
        slug,
        is_solo: false,
      })
      .eq("id", workspaceId);
    if (error) {
      if (error.code === "23505") throw new Error("That URL is already taken.");
      throw new Error(error.message);
    }
  }

  async function handleStep2() {
    if (!workspaceId || !memberId) throw new Error("Missing workspace.");
    const rows = services.map((s) => ({
      workspace_id: workspaceId,
      name: s.name.trim(),
      duration_minutes: s.duration,
      price_cents: Math.round(parseFloat(s.priceDollars || "0") * 100),
      currency: "USD",
    }));
    const { data: inserted, error } = await supabase
      .from("services")
      .insert(rows)
      .select("id");
    if (error) throw new Error(error.message);

    // Link the owner as provider on every created service.
    if (inserted && inserted.length) {
      const links = inserted.map((s) => ({
        workspace_id: workspaceId,
        service_id: s.id,
        member_id: memberId,
      }));
      const { error: linkErr } = await supabase
        .from("service_providers")
        .insert(links);
      if (linkErr) throw new Error(linkErr.message);
    }
  }

  async function handleStep3() {
    if (!workspaceId || !memberId) throw new Error("Missing workspace.");
    const rows = days
      .filter((d) => d.active)
      .map((d) => ({
        workspace_id: workspaceId,
        member_id: memberId,
        day_of_week: d.dow,
        start_time: `${d.start}:00`,
        end_time: `${d.end}:00`,
      }));
    if (rows.length === 0) return;
    const { error } = await supabase.from("provider_availability").insert(rows);
    if (error) throw new Error(error.message);
  }

  async function next() {
    if (!canNext) return;
    setSubmitting(true);
    setTopError(null);
    try {
      if (step === 0) await handleStep0();
      else if (step === 1) await handleStep1();
      else if (step === 2) await handleStep2();
      else if (step === 3) {
        await handleStep3();
        setFinalizing(true);
        await new Promise((r) => setTimeout(r, 1500));
        navigate({ to: "/dashboard/home" });
        return;
      }
      setDirection(1);
      setStep((s) => ((s + 1) as StepId));
    } catch (e) {
      setTopError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  function back() {
    if (step === 0 || submitting) return;
    setDirection(-1);
    setTopError(null);
    setStep((s) => ((s - 1) as StepId));
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/40">
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-5 py-10 sm:px-8">
        {/* Header / progress */}
        <header className="mb-10">
          <div className="mb-1 flex items-center gap-2 text-sm font-medium text-indigo-600">
            <Sparkles className="h-4 w-4" />
            Welcome aboard
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Set up your scheduling workspace
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Takes about 2 minutes. You can refine everything later.
          </p>

          <ProgressBar current={step} />
        </header>

        {/* Card */}
        <main className="flex-1">
          <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 p-6 shadow-[0_10px_40px_-20px_rgba(15,23,42,0.2)] backdrop-blur sm:p-8">
            <AnimatePresence custom={direction} mode="wait">
              {finalizing ? (
                <SuccessState key="success" />
              ) : (
                <motion.div
                  key={step}
                  custom={direction}
                  initial={{ opacity: 0, x: direction * 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: direction * -24 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                >
                  {step === 0 && (
                    <StepAccount
                      firstName={firstName}
                      lastName={lastName}
                      email={email}
                      password={password}
                      setFirstName={setFirstName}
                      setLastName={setLastName}
                      setEmail={setEmail}
                      setPassword={setPassword}
                    />
                  )}
                  {step === 1 && (
                    <StepWorkspace
                      bizName={bizName}
                      slug={slug}
                      slugStatus={slugStatus}
                      onBizName={setBizName}
                      onSlug={(v) => {
                        setSlugTouched(true);
                        setSlug(slugify(v));
                      }}
                    />
                  )}
                  {step === 2 && (
                    <StepServices services={services} setServices={setServices} />
                  )}
                  {step === 3 && <StepAvailability days={days} setDays={setDays} />}
                </motion.div>
              )}
            </AnimatePresence>

            {topError && !finalizing && (
              <div className="mt-5 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                <X className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{topError}</span>
              </div>
            )}
          </div>

          {/* Footer nav */}
          {!finalizing && (
            <div className="mt-6 flex items-center justify-between">
              <button
                type="button"
                onClick={back}
                disabled={step === 0 || submitting}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:text-slate-900 disabled:opacity-40"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>

              <div className="flex items-center gap-3">
                {step === 2 && services.length === 1 && services[0].name === "" && (
                  <button
                    type="button"
                    onClick={() => {
                      setDirection(1);
                      setStep((s) => ((s + 1) as StepId));
                    }}
                    className="text-sm font-medium text-slate-500 hover:text-slate-800"
                  >
                    Skip for now
                  </button>
                )}
                <button
                  type="button"
                  onClick={next}
                  disabled={!canNext}
                  className="group inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Working…
                    </>
                  ) : step === 3 ? (
                    <>
                      Finish setup
                      <Check className="h-4 w-4" />
                    </>
                  ) : (
                    <>
                      Continue
                      <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

/* ---------- progress ---------- */

function ProgressBar({ current }: { current: number }) {
  return (
    <ol className="mt-7 flex items-center gap-2">
      {STEPS.map((s, i) => {
        const done = i < current;
        const active = i === current;
        const Icon = s.icon;
        return (
          <li key={s.id} className="flex flex-1 items-center gap-2">
            <div
              className={[
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-all",
                done
                  ? "border-indigo-600 bg-indigo-600 text-white"
                  : active
                    ? "border-indigo-600 bg-white text-indigo-600 ring-4 ring-indigo-100"
                    : "border-slate-200 bg-white text-slate-400",
              ].join(" ")}
            >
              {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
            </div>
            <div className="hidden flex-col sm:flex">
              <span
                className={[
                  "text-xs font-medium",
                  active ? "text-slate-900" : done ? "text-slate-700" : "text-slate-400",
                ].join(" ")}
              >
                Step {i + 1}
              </span>
              <span
                className={[
                  "text-xs",
                  active || done ? "text-slate-600" : "text-slate-400",
                ].join(" ")}
              >
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className="relative ml-2 hidden h-px flex-1 bg-slate-200 sm:block">
                <motion.div
                  className="absolute inset-y-0 left-0 bg-indigo-600"
                  initial={false}
                  animate={{ width: done ? "100%" : "0%" }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/* ---------- steps ---------- */

function Field({
  label,
  icon: Icon,
  children,
  hint,
}: {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  hint?: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700">
        {Icon && <Icon className="h-3.5 w-3.5 text-slate-400" />}
        {label}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}

const inputCls =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

function StepAccount(props: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  setFirstName: (v: string) => void;
  setLastName: (v: string) => void;
  setEmail: (v: string) => void;
  setPassword: (v: string) => void;
}) {
  return (
    <div>
      <h2 className="text-xl font-semibold text-slate-900">Create your account</h2>
      <p className="mt-1 text-sm text-slate-500">
        You'll be the owner of this workspace.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Field label="First name" icon={User}>
          <input
            className={inputCls}
            value={props.firstName}
            onChange={(e) => props.setFirstName(e.target.value)}
            placeholder="Jane"
            autoComplete="given-name"
          />
        </Field>
        <Field label="Last name" icon={User}>
          <input
            className={inputCls}
            value={props.lastName}
            onChange={(e) => props.setLastName(e.target.value)}
            placeholder="Doe"
            autoComplete="family-name"
          />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Work email" icon={Mail}>
            <input
              type="email"
              className={inputCls}
              value={props.email}
              onChange={(e) => props.setEmail(e.target.value)}
              placeholder="jane@acme.com"
              autoComplete="email"
            />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field
            label="Password"
            icon={Lock}
            hint="At least 8 characters. Use a mix you'll remember."
          >
            <input
              type="password"
              className={inputCls}
              value={props.password}
              onChange={(e) => props.setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
            />
          </Field>
        </div>
      </div>
    </div>
  );
}

function StepWorkspace(props: {
  bizName: string;
  slug: string;
  slugStatus: "idle" | "checking" | "available" | "taken" | "invalid";
  onBizName: (v: string) => void;
  onSlug: (v: string) => void;
}) {
  const host =
    typeof window !== "undefined" ? window.location.host : "yourapp.com";
  return (
    <div>
      <h2 className="text-xl font-semibold text-slate-900">Name your business</h2>
      <p className="mt-1 text-sm text-slate-500">
        This is what your clients will see on your booking page.
      </p>
      <div className="mt-6 space-y-4">
        <Field label="Business name" icon={Briefcase}>
          <input
            className={inputCls}
            value={props.bizName}
            onChange={(e) => props.onBizName(e.target.value)}
            placeholder="Acme Studio"
            autoFocus
          />
        </Field>
        <Field
          label="Booking URL"
          hint={`Your public booking page lives at ${host}/book/<your-slug>`}
        >
          <div className="flex items-stretch overflow-hidden rounded-lg border border-slate-200 bg-white focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100">
            <span className="flex items-center bg-slate-50 px-3 text-xs text-slate-500">
              {host}/book/
            </span>
            <input
              className="flex-1 bg-transparent px-3 py-2.5 text-sm text-slate-900 outline-none"
              value={props.slug}
              onChange={(e) => props.onSlug(e.target.value)}
              placeholder="acme-studio"
            />
            <span className="flex w-10 items-center justify-center">
              <SlugIndicator status={props.slugStatus} />
            </span>
          </div>
          {props.slugStatus === "taken" && (
            <span className="mt-1 block text-xs text-red-600">
              Sorry, that URL is taken. Try a variation.
            </span>
          )}
          {props.slugStatus === "invalid" && (
            <span className="mt-1 block text-xs text-amber-600">
              Use lowercase letters, numbers and hyphens only.
            </span>
          )}
          {props.slugStatus === "available" && (
            <span className="mt-1 block text-xs text-emerald-600">
              Nice — that URL is available.
            </span>
          )}
        </Field>
      </div>
    </div>
  );
}

function SlugIndicator({
  status,
}: {
  status: "idle" | "checking" | "available" | "taken" | "invalid";
}) {
  if (status === "checking")
    return <Loader2 className="h-4 w-4 animate-spin text-slate-400" />;
  if (status === "available")
    return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
  if (status === "taken") return <X className="h-4 w-4 text-red-500" />;
  if (status === "invalid") return <X className="h-4 w-4 text-amber-500" />;
  return null;
}

function StepServices({
  services,
  setServices,
}: {
  services: ServiceDraft[];
  setServices: (s: ServiceDraft[]) => void;
}) {
  function update(id: string, patch: Partial<ServiceDraft>) {
    setServices(services.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }
  function add() {
    setServices([
      ...services,
      {
        id: crypto.randomUUID(),
        name: "",
        duration: 30,
        priceDollars: "50.00",
      },
    ]);
  }
  function remove(id: string) {
    if (services.length === 1) return;
    setServices(services.filter((s) => s.id !== id));
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-slate-900">Add your first service</h2>
      <p className="mt-1 text-sm text-slate-500">
        What can clients book? You can add more later.
      </p>

      <div className="mt-6 space-y-3">
        {services.map((s, idx) => (
          <div
            key={s.id}
            className="rounded-xl border border-slate-200 bg-slate-50/50 p-4"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Service {idx + 1}
              </span>
              {services.length > 1 && (
                <button
                  type="button"
                  onClick={() => remove(s.id)}
                  className="text-slate-400 hover:text-red-500"
                  aria-label="Remove service"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-6">
              <div className="sm:col-span-6">
                <Field label="Service name">
                  <input
                    className={inputCls}
                    value={s.name}
                    onChange={(e) => update(s.id, { name: e.target.value })}
                    placeholder="60-Minute Initial Consultation"
                  />
                </Field>
              </div>
              <div className="sm:col-span-3">
                <Field label="Duration" icon={Clock}>
                  <select
                    className={inputCls}
                    value={s.duration}
                    onChange={(e) =>
                      update(s.id, { duration: parseInt(e.target.value, 10) })
                    }
                  >
                    {[15, 30, 45, 60, 75, 90, 120, 180].map((m) => (
                      <option key={m} value={m}>
                        {m} minutes
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <div className="sm:col-span-3">
                <Field label="Price" icon={DollarSign}>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                      $
                    </span>
                    <input
                      inputMode="decimal"
                      className={`${inputCls} pl-6`}
                      value={s.priceDollars}
                      onChange={(e) => {
                        const v = e.target.value.replace(/[^0-9.]/g, "");
                        update(s.id, { priceDollars: v });
                      }}
                      placeholder="0.00"
                    />
                  </div>
                </Field>
              </div>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={add}
          className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-indigo-400 hover:text-indigo-600"
        >
          <Plus className="h-4 w-4" />
          Add another service
        </button>
      </div>
    </div>
  );
}

function StepAvailability({
  days,
  setDays,
}: {
  days: DayDraft[];
  setDays: (d: DayDraft[]) => void;
}) {
  function update(dow: number, patch: Partial<DayDraft>) {
    setDays(days.map((d) => (d.dow === dow ? { ...d, ...patch } : d)));
  }
  return (
    <div>
      <h2 className="text-xl font-semibold text-slate-900">When are you available?</h2>
      <p className="mt-1 text-sm text-slate-500">
        Set your standard weekly hours. You can override specific dates later.
      </p>
      <div className="mt-6 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
        {DAYS.map((d) => {
          const row = days.find((x) => x.dow === d.dow)!;
          return (
            <div
              key={d.dow}
              className="grid grid-cols-12 items-center gap-3 px-4 py-3"
            >
              <div className="col-span-5 sm:col-span-4">
                <div className="flex items-center gap-3">
                  <Toggle
                    checked={row.active}
                    onChange={(v) => update(d.dow, { active: v })}
                  />
                  <span
                    className={`text-sm font-medium ${row.active ? "text-slate-900" : "text-slate-400"}`}
                  >
                    {d.label}
                  </span>
                </div>
              </div>
              <div className="col-span-7 sm:col-span-8">
                {row.active ? (
                  <div className="flex items-center justify-end gap-2">
                    <input
                      type="time"
                      className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                      value={row.start}
                      onChange={(e) =>
                        update(d.dow, { start: e.target.value })
                      }
                    />
                    <span className="text-xs text-slate-400">to</span>
                    <input
                      type="time"
                      className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                      value={row.end}
                      onChange={(e) => update(d.dow, { end: e.target.value })}
                    />
                  </div>
                ) : (
                  <div className="text-right text-xs text-slate-400">
                    Unavailable
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border transition ${
        checked
          ? "border-indigo-600 bg-indigo-600"
          : "border-slate-200 bg-slate-200"
      }`}
    >
      <motion.span
        layout
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ${
          checked ? "translate-x-4" : "translate-x-0.5"
        } mt-[1px]`}
      />
    </button>
  );
}

function SuccessState() {
  return (
    <motion.div
      key="success"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center justify-center py-10 text-center"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 18 }}
        className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"
      >
        <Check className="h-8 w-8" strokeWidth={3} />
      </motion.div>
      <h2 className="mt-5 text-xl font-semibold text-slate-900">
        Setting up your workspace…
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        Bringing you to your dashboard.
      </p>
      <div className="mt-6 h-1 w-40 overflow-hidden rounded-full bg-slate-100">
        <motion.div
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ duration: 1.4, ease: "easeInOut" }}
          className="h-full bg-emerald-500"
        />
      </div>
    </motion.div>
  );
}
