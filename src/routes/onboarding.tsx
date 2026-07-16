import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import confetti from "canvas-confetti";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Plus,
  Star,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  completeOnboarding,
  getOnboardingContext,
  uploadOnboardingImage,
  checkSlugAvailable,
} from "@/lib/onboarding.functions";
import { finalizeTenantSignup } from "@/lib/tenant.functions";
import { supabase } from "@/integrations/supabase/client";
import { LivePreview } from "@/components/onboarding/LivePreview";
import {
  INDUSTRIES,
  INTAKE_TYPE_LABELS,
  DURATION_OPTIONS,
  CANCELLATION_OPTIONS,
  GRACE_OPTIONS,
  TIME_OPTIONS,
  DAYS,
  CALENDLY_URL,
  getIndustry,
  initialWizard,
  emptyService,
  uid,
  durationToMinutes,
  defaultThemeForIndustry,
  THEMES,
  type ThemeId,
  type WizardState,
  type IndustryId,
  type IntakeType,
  type LocationType,
} from "@/components/onboarding/wizard-config";

export const Route = createFileRoute("/onboarding")({
  component: OnboardingWizard,
  head: () => ({
    meta: [
      { title: "Create your account & booking site — ProcSchedule" },
      {
        name: "description",
        content:
          "Sign up and build your branded booking site in a few quick steps — account, industry, identity, services, hours, policies, and intake.",
      },
    ],
  }),
});

const STEP_LABELS = [
  "Account",
  "Industry",
  "Identity",
  "Photos",
  "Services",
  "Hours",
  "Policies",
  "Intake",
  "Preview",
];

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

// ---------- helpers ----------

async function fileToBase64(file: File): Promise<{ base64: string; dataUrl: string }> {
  const dataUrl: string = await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
  const base64 = dataUrl.split(",")[1] ?? "";
  return { base64, dataUrl };
}

function extractColors(dataUrl: string): Promise<[string, string] | null> {
  return new Promise((resolve) => {
    const CT = (window as unknown as { ColorThief?: new () => { getPalette: (img: HTMLImageElement, n: number) => number[][] } }).ColorThief;
    if (!CT) return resolve(null);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const thief = new CT();
        const palette = thief.getPalette(img, 3);
        const toHex = (rgb: number[]) =>
          "#" + rgb.map((c) => c.toString(16).padStart(2, "0")).join("");
        if (palette && palette.length >= 2) {
          resolve([toHex(palette[0]), toHex(palette[1])]);
        } else if (palette && palette.length === 1) {
          resolve([toHex(palette[0]), toHex(palette[0])]);
        } else {
          resolve(null);
        }
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

// ---------- main ----------

function OnboardingWizard() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [wizard, setWizard] = useState<WizardState>(initialWizard);
  const [error, setError] = useState<string | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [hasAccount, setHasAccount] = useState(false);

  // Identity gate: if a session is already sitting in this browser, we do NOT
  // silently drop the visitor into that account's dashboard. Show a card and
  // require an explicit "Continue" or "Sign out" click.
  const [checkingSession, setCheckingSession] = useState(true);
  const [existingUser, setExistingUser] = useState<{ id: string; email: string | null } | null>(null);
  const [existingOnboarded, setExistingOnboarded] = useState(false);

  const getCtx = useServerFn(getOnboardingContext);

  useEffect(() => {
    let cancelled = false;
    // getUser() revalidates with the auth server — do not trust a raw session.
    supabase.auth.getUser().then(async ({ data, error: userErr }) => {
      if (cancelled) return;
      if (userErr || !data.user) {
        setExistingUser(null);
        setCheckingSession(false);
        return;
      }
      const user = { id: data.user.id, email: data.user.email ?? null };
      try {
        const ctx = await getCtx();
        if (cancelled) return;
        if (ctx.onboarded) {
          // Signed in AND already onboarded — show the identity gate rather
          // than silently redirecting into that account's dashboard.
          setExistingUser(user);
          setExistingOnboarded(true);
        } else {
          // Same person mid-setup — skip the account step and continue.
          setWorkspaceId(ctx.workspaceId);
          setHasAccount(true);
          setWizard((w) => (w.businessName ? w : { ...w, businessName: ctx.name ?? "" }));
          setStep((s) => (s === 1 ? 2 : s));
        }
      } catch {
        // Signed in but no workspace yet — keep them on the account step.
      } finally {
        if (!cancelled) setCheckingSession(false);
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const patch = (p: Partial<WizardState>) => setWizard((w) => ({ ...w, ...p }));

  function validateStep(s: number): string | null {
    if (s === 2 && !wizard.industry) return "Pick an industry to continue.";
    if (s === 3 && !wizard.businessName.trim()) return "Business name is required.";
    return null;
  }

  function next() {
    const err = validateStep(step);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setStep((s) => Math.min(9, s + 1));
  }
  function back() {
    setError(null);
    // Never let the user step back into the account creation form once created.
    setStep((s) => Math.max(hasAccount ? 2 : 1, s - 1));
  }

  function onAccountCreated(ctx: { workspaceId: string; businessName: string }) {
    setWorkspaceId(ctx.workspaceId);
    setHasAccount(true);
    setWizard((w) => ({ ...w, businessName: ctx.businessName }));
    setError(null);
    setStep(2);
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Progress */}
      <div className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-3">
          <div className="flex items-center gap-1.5">
            {STEP_LABELS.map((label, i) => {
              const idx = i + 1;
              const active = idx === step;
              const done = idx < step;
              return (
                <div key={label} className="flex flex-1 flex-col items-center gap-1">
                  <div className="flex w-full items-center">
                    <div
                      className={`h-1.5 w-full rounded-full transition-colors ${
                        done || active ? "bg-primary" : "bg-muted"
                      }`}
                    />
                  </div>
                  <span
                    className={`hidden text-[11px] sm:block ${
                      active ? "font-semibold text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 py-8 lg:grid-cols-2">
        {/* Form */}
        <div className="order-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2 }}
            >
              {step === 1 && <StepAccount onCreated={onAccountCreated} />}
              {step === 2 && <StepIndustry wizard={wizard} patch={patch} onPick={() => setTimeout(next, 120)} />}
              {step === 3 && (
                <StepIdentity wizard={wizard} patch={patch} workspaceId={workspaceId} />
              )}
              {step === 4 && <StepPhotos wizard={wizard} patch={patch} workspaceId={workspaceId} />}
              {step === 5 && <StepServices wizard={wizard} patch={patch} />}
              {step === 6 && <StepHours wizard={wizard} patch={patch} />}
              {step === 7 && <StepPolicies wizard={wizard} patch={patch} />}
              {step === 8 && <StepIntake wizard={wizard} patch={patch} />}
              {step === 9 && <StepPreview wizard={wizard} navigate={navigate} />}
            </motion.div>
          </AnimatePresence>

          {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

          {step > 1 && step < 9 && (
            <div className="mt-8 flex items-center justify-between">
              {step > 2 ? (
                <Button variant="ghost" onClick={back}>
                  <ArrowLeft className="mr-1.5 h-4 w-4" /> Back
                </Button>
              ) : (
                <span />
              )}
              {step !== 2 && (
                <Button onClick={next}>
                  Continue <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>


        {/* Live preview */}
        <div className="order-2 lg:sticky lg:top-24 lg:self-start">
          <LivePreview wizard={wizard} />
        </div>
      </div>
    </div>
  );
}

type StepProps = {
  wizard: WizardState;
  patch: (p: Partial<WizardState>) => void;
};

// ---------- Step: Account (create account) ----------
function StepAccount({
  onCreated,
}: {
  onCreated: (ctx: { workspaceId: string; businessName: string }) => void;
}) {
  const navigate = useNavigate();
  const finalize = useServerFn(finalizeTenantSignup);
  const getCtx = useServerFn(getOnboardingContext);
  const checkSlug = useServerFn(checkSlugAvailable);

  const [businessName, setBusinessName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [slugStatus, setSlugStatus] = useState<
    "idle" | "checking" | "ok" | "taken" | "invalid"
  >("idle");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slugTouched) setSlug(slugify(businessName));
  }, [businessName, slugTouched]);

  useEffect(() => {
    if (!slug) {
      setSlugStatus("idle");
      return;
    }
    if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(slug) || slug.length < 2) {
      setSlugStatus("invalid");
      return;
    }
    setSlugStatus("checking");
    const t = setTimeout(async () => {
      try {
        const r = await checkSlug({ data: { slug } });
        setSlugStatus(r.available ? "ok" : "taken");
      } catch {
        setSlugStatus("idle");
      }
    }, 350);
    return () => clearTimeout(t);
  }, [slug, checkSlug]);

  const canSubmit =
    !loading &&
    !!email &&
    password.length >= 8 &&
    !!businessName.trim() &&
    slugStatus === "ok";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!canSubmit) return;
    setLoading(true);
    try {
      const { data: auth, error: authErr } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: businessName },
          emailRedirectTo: `${window.location.origin}/login`,
        },
      });
      if (authErr) throw authErr;
      if (!auth.user?.id) throw new Error("Signup did not return a user.");

      // handle_new_user trigger creates a default workspace + membership.
      await finalize({ data: { businessName: businessName.trim(), slug } });

      // Without an active session the rest of the wizard can't upload/save.
      if (!auth.session) {
        navigate({ to: "/login", search: { confirm: "1" } as never });
        return;
      }

      const ctx = await getCtx();
      onCreated({ workspaceId: ctx.workspaceId, businessName: businessName.trim() });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create account.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <h1 className="text-2xl font-bold tracking-tight">Create your account</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Your branded booking page will live at{" "}
        <span className="font-mono">procschedule.com/your-name</span>
      </p>

      <div className="mt-6 space-y-5">
        <div>
          <Label htmlFor="acct-bn">Business name</Label>
          <Input
            id="acct-bn"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="e.g. Dolliimarie Hair Studio"
            className="mt-1.5"
            autoFocus
            required
          />
        </div>

        <div>
          <Label htmlFor="acct-slug">Your URL</Label>
          <div className="mt-1.5 flex items-stretch overflow-hidden rounded-md border focus-within:ring-1 focus-within:ring-ring">
            <span className="flex items-center bg-muted px-3 py-2 text-sm text-muted-foreground">
              procschedule.com/
            </span>
            <input
              id="acct-slug"
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value.toLowerCase());
              }}
              placeholder="your-name"
              className="flex-1 bg-transparent px-3 py-2 text-sm outline-none"
              required
            />
            <div className="flex items-center px-3">
              {slugStatus === "checking" && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
              {slugStatus === "ok" && <Check className="h-4 w-4 text-green-600" />}
              {(slugStatus === "taken" || slugStatus === "invalid") && (
                <X className="h-4 w-4 text-destructive" />
              )}
            </div>
          </div>
          {slugStatus === "taken" && (
            <p className="mt-1 text-xs text-destructive">This URL is taken.</p>
          )}
          {slugStatus === "invalid" && (
            <p className="mt-1 text-xs text-destructive">
              Use lowercase letters, numbers, and hyphens (min 2).
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="acct-email">Email</Label>
          <Input
            id="acct-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@business.com"
            className="mt-1.5"
            required
          />
        </div>

        <div>
          <Label htmlFor="acct-pw">Password</Label>
          <Input
            id="acct-pw"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            minLength={8}
            className="mt-1.5"
            required
          />
        </div>

        {error && (
          <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <Button type="submit" disabled={!canSubmit} className="w-full">
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Create account & continue
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <a href="/login" className="text-primary hover:underline">
            Sign in
          </a>
        </p>
      </div>
    </form>
  );
}



// ---------- Step 1 ----------
function StepIndustry({
  wizard,
  patch,
  onPick,
}: StepProps & { onPick: () => void }) {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">What kind of business do you run?</h1>
      <p className="mt-1 text-sm text-muted-foreground">We'll tailor your setup based on your industry.</p>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-2">
        {INDUSTRIES.map((ind) => {
          const Icon = ind.icon;
          const selected = wizard.industry === ind.id;
          return (
            <button
              key={ind.id}
              onClick={() => {
                const i = getIndustry(ind.id);
                patch({
                  industry: ind.id,
                  themeId: defaultThemeForIndustry(ind.id),
                  bio: wizard.bio || "",
                  policies: { ...wizard.policies, deposit: String(i.deposit) },
                });
                onPick();
              }}
              className={`flex flex-col items-start gap-3 rounded-xl border p-4 text-left transition-all hover:border-primary/60 hover:shadow-sm ${
                selected ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border"
              }`}
            >
              <Icon className="h-6 w-6 text-primary" />
              <span className="text-sm font-semibold">{ind.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------- Step 2 ----------
function StepIdentity({
  wizard,
  patch,
  workspaceId,
}: StepProps & { workspaceId: string | null }) {
  const industry = getIndustry(wizard.industry);
  const upload = useServerFn(uploadOnboardingImage);
  const [uploading, setUploading] = useState(false);
  const [detected, setDetected] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onLogo(file: File) {
    setUploading(true);
    try {
      const { base64, dataUrl } = await fileToBase64(file);
      patch({ logoDataUrl: dataUrl });
      const colors = await extractColors(dataUrl);
      if (colors) {
        patch({ primaryColor: colors[0], secondaryColor: colors[1] });
        setDetected(true);
      }
      if (workspaceId) {
        const res = await upload({
          data: {
            workspaceId,
            kind: "logo",
            fileName: file.name,
            contentType: file.type || "image/png",
            dataBase64: base64,
          },
        });
        patch({ logoUrl: res.url });
      }
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Tell us about your business</h1>
      <p className="mt-1 text-sm text-muted-foreground">This shapes your booking site's identity.</p>

      <div className="mt-6 space-y-5">
        <div>
          <Label htmlFor="bn">Business Name</Label>
          <Input
            id="bn"
            value={wizard.businessName}
            onChange={(e) => patch({ businessName: e.target.value })}
            placeholder="e.g. Dolliimarie Hair Studio"
            className="mt-1.5"
          />
        </div>
        <div>
          <Label htmlFor="title">Your Name / Title</Label>
          <Input
            id="title"
            value={wizard.ownerTitle}
            onChange={(e) => patch({ ownerTitle: e.target.value })}
            placeholder="e.g. Melanie, Lead Stylist"
            className="mt-1.5"
          />
        </div>
        <div>
          <Label htmlFor="bio">Short Bio or Tagline</Label>
          <Textarea
            id="bio"
            value={wizard.bio}
            maxLength={160}
            onChange={(e) => patch({ bio: e.target.value })}
            placeholder={industry.bioPlaceholder}
            className="mt-1.5"
          />
          <p className="mt-1 text-right text-xs text-muted-foreground">{wizard.bio.length}/160</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="biz-phone">Business phone</Label>
            <Input
              id="biz-phone"
              value={wizard.businessPhone}
              onChange={(e) => patch({ businessPhone: e.target.value })}
              placeholder="(555) 123-4567"
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="biz-email">Contact email</Label>
            <Input
              id="biz-email"
              value={wizard.businessEmail}
              onChange={(e) => patch({ businessEmail: e.target.value })}
              placeholder="hello@yourbusiness.com"
              className="mt-1.5"
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="biz-website">Website</Label>
            <Input
              id="biz-website"
              value={wizard.businessWebsite}
              onChange={(e) => patch({ businessWebsite: e.target.value })}
              placeholder="www.yourbusiness.com"
              className="mt-1.5"
            />
          </div>
          <p className="sm:col-span-2 -mt-1 text-xs text-muted-foreground">
            Shown to clients on their booking confirmation email.
          </p>
        </div>


        <div>
          <Label>Logo</Label>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/svg+xml"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onLogo(f);
            }}
          />
          <div className="mt-1.5 flex items-center gap-4">
            <button
              onClick={() => fileRef.current?.click()}
              className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl border border-dashed border-border bg-muted/40 hover:border-primary/60"
            >
              {uploading ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : wizard.logoDataUrl ? (
                <img src={wizard.logoDataUrl} alt="Logo" className="h-full w-full object-cover" />
              ) : (
                <Upload className="h-5 w-5 text-muted-foreground" />
              )}
            </button>
            <div className="text-xs text-muted-foreground">
              PNG, JPG or SVG.
              <br />
              We'll pull your brand colors automatically.
            </div>
          </div>
        </div>

        {detected && (
          <div className="rounded-xl border border-border p-4">
            <p className="mb-3 text-sm font-medium">Colors detected from your logo.</p>
            <div className="flex gap-6">
              <ColorField
                label="Primary"
                value={wizard.primaryColor}
                onChange={(v) => patch({ primaryColor: v })}
              />
              <ColorField
                label="Secondary"
                value={wizard.secondaryColor}
                onChange={(v) => patch({ secondaryColor: v })}
              />
            </div>
          </div>
        )}

        <div className="rounded-xl border border-border p-4">
          <p className="mb-1 text-sm font-medium">Storefront theme</p>
          <p className="mb-3 text-xs text-muted-foreground">
            We picked one based on your industry — change it anytime.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {THEMES.map((t) => {
              const active = wizard.themeId === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => patch({ themeId: t.id as ThemeId })}
                  className={`flex flex-col gap-2 rounded-xl border p-3 text-left transition-all hover:border-primary/60 ${
                    active ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border"
                  }`}
                >
                  <div className="flex gap-1.5">
                    {t.swatch.map((c) => (
                      <span
                        key={c}
                        className="h-5 w-5 rounded-full border border-black/10"
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                  <span className="text-sm font-semibold">{t.label}</span>
                  <span className="text-xs text-muted-foreground">{t.description}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <label className="relative h-9 w-9 cursor-pointer overflow-hidden rounded-lg border border-border">
        <span className="block h-full w-full" style={{ backgroundColor: value }} />
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </label>
      <div className="text-xs">
        <p className="font-medium">{label}</p>
        <p className="uppercase text-muted-foreground">{value}</p>
      </div>
    </div>
  );
}

// ---------- Step 3 ----------
function StepPhotos({
  wizard,
  patch,
  workspaceId,
}: StepProps & { workspaceId: string | null }) {
  const upload = useServerFn(uploadOnboardingImage);
  const fileRef = useRef<HTMLInputElement>(null);
  const slots = Array.from({ length: 9 });

  async function addFiles(files: FileList) {
    const remaining = 9 - wizard.portfolio.length;
    const list = Array.from(files).slice(0, remaining);
    for (const f of list) {
      const id = uid();
      const { base64, dataUrl } = await fileToBase64(f);
      patch({ portfolio: [...wizardRef.current.portfolio, { id, dataUrl }] });
      if (workspaceId) {
        try {
          const res = await upload({
            data: {
              workspaceId,
              kind: "portfolio",
              fileName: f.name,
              contentType: f.type || "image/jpeg",
              dataBase64: base64,
            },
          });
          patch({
            portfolio: wizardRef.current.portfolio.map((p) =>
              p.id === id ? { ...p, url: res.url } : p,
            ),
          });
        } catch {
          /* ignore upload errors; preview still works */
        }
      }
    }
  }

  // keep a ref to latest portfolio for async loops
  const wizardRef = useRef(wizard);
  wizardRef.current = wizard;

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Show off your work</h1>
      <p className="mt-1 text-sm text-muted-foreground">Add up to 9 photos for your gallery.</p>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && addFiles(e.target.files)}
      />

      <div className="mt-6 grid grid-cols-3 gap-3">
        {slots.map((_, i) => {
          const photo = wizard.portfolio[i];
          if (photo) {
            return (
              <div key={photo.id} className="group relative aspect-square overflow-hidden rounded-xl border border-border">
                <img src={photo.dataUrl} alt="Portfolio" className="h-full w-full object-cover" />
                <button
                  onClick={() => patch({ portfolio: wizard.portfolio.filter((p) => p.id !== photo.id) })}
                  className="absolute right-1.5 top-1.5 rounded-full bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          }
          const isNext = i === wizard.portfolio.length;
          return (
            <button
              key={i}
              onClick={() => isNext && fileRef.current?.click()}
              className={`flex aspect-square items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 ${
                isNext ? "hover:border-primary/60" : "cursor-default opacity-60"
              }`}
            >
              {isNext ? <Plus className="h-5 w-5 text-muted-foreground" /> : null}
            </button>
          );
        })}
      </div>
      <p className="mt-4 text-sm text-muted-foreground">
        Don't have photos yet? You can add them later from your dashboard.
      </p>
    </div>
  );
}

// ---------- Step 4 ----------
function StepServices({ wizard, patch }: StepProps) {
  const industry = getIndustry(wizard.industry);
  const placeholders = industry.services;

  function update(id: string, p: Partial<WizardState["services"][number]>) {
    patch({ services: wizard.services.map((s) => (s.id === id ? { ...s, ...p } : s)) });
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">What services do you offer?</h1>
      <p className="mt-1 text-sm text-muted-foreground">Add the services clients can book.</p>

      <div className="mt-6 space-y-4">
        {wizard.services.map((s, idx) => (
          <div key={s.id} className="rounded-xl border border-border p-4">
            <div className="flex items-start gap-3">
              <div className="flex-1 space-y-3">
                <Input
                  value={s.name}
                  onChange={(e) => update(s.id, { name: e.target.value })}
                  placeholder={placeholders[idx % placeholders.length]}
                />
                <Textarea
                  value={s.description}
                  onChange={(e) => update(s.id, { description: e.target.value })}
                  placeholder="Description (optional)"
                  className="min-h-[60px]"
                />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Duration</Label>
                    <Select value={s.duration} onValueChange={(v) => update(s.id, { duration: v })}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DURATION_OPTIONS.map((d) => (
                          <SelectItem key={d.value} value={d.value}>
                            {d.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Price ($)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={s.price}
                      onChange={(e) => update(s.id, { price: e.target.value })}
                      placeholder="0"
                      className="mt-1"
                    />
                  </div>
                </div>
                {s.duration === "custom" && (
                  <div>
                    <Label className="text-xs">Custom duration (minutes)</Label>
                    <Input
                      type="number"
                      min="1"
                      value={s.customDuration}
                      onChange={(e) => update(s.id, { customDuration: e.target.value })}
                      placeholder="e.g. 75"
                      className="mt-1"
                    />
                  </div>
                )}

                {/* Options */}
                <div className="space-y-2">
                  {s.options.map((opt) => (
                    <div key={opt.id} className="flex items-center gap-2">
                      <Input
                        value={opt.label}
                        onChange={(e) =>
                          update(s.id, {
                            options: s.options.map((o) =>
                              o.id === opt.id ? { ...o, label: e.target.value } : o,
                            ),
                          })
                        }
                        placeholder="Option (e.g. Small)"
                      />
                      <Input
                        type="number"
                        min="0"
                        value={opt.price}
                        onChange={(e) =>
                          update(s.id, {
                            options: s.options.map((o) =>
                              o.id === opt.id ? { ...o, price: e.target.value } : o,
                            ),
                          })
                        }
                        placeholder="+$"
                        className="w-24"
                      />
                      <button
                        onClick={() =>
                          update(s.id, { options: s.options.filter((o) => o.id !== opt.id) })
                        }
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() =>
                      update(s.id, {
                        options: [...s.options, { id: uid(), label: "", price: "" }],
                      })
                    }
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    + Add option
                  </button>
                </div>
              </div>
              <button
                onClick={() => patch({ services: wizard.services.filter((x) => x.id !== s.id) })}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}

        <Button
          variant="outline"
          onClick={() =>
            patch({
              services: [
                ...wizard.services,
                emptyService(placeholders[wizard.services.length % placeholders.length] ?? ""),
              ],
            })
          }
        >
          <Plus className="mr-1.5 h-4 w-4" /> Add Service
        </Button>
      </div>
    </div>
  );
}

// ---------- Step 5 ----------
function StepHours({ wizard, patch }: StepProps) {
  function update(dow: number, p: Partial<WizardState["hours"][number]>) {
    patch({ hours: wizard.hours.map((h) => (h.dow === dow ? { ...h, ...p } : h)) });
  }
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">When are you available?</h1>
      <p className="mt-1 text-sm text-muted-foreground">Set your weekly hours and location.</p>

      <div className="mt-6 space-y-2">
        {DAYS.map((d) => {
          const h = wizard.hours.find((x) => x.dow === d.dow)!;
          return (
            <div key={d.dow} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2">
              <div className="flex w-32 items-center gap-2">
                <Switch checked={h.open} onCheckedChange={(v) => update(d.dow, { open: v })} />
                <span className="text-sm font-medium">{d.label}</span>
              </div>
              {h.open ? (
                <div className="flex flex-1 items-center gap-2">
                  <TimeSelect value={h.start} onChange={(v) => update(d.dow, { start: v })} />
                  <span className="text-muted-foreground">–</span>
                  <TimeSelect value={h.end} onChange={(v) => update(d.dow, { end: v })} />
                </div>
              ) : (
                <span className="flex-1 text-sm text-muted-foreground">Closed</span>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-8">
        <Label className="text-sm font-semibold">Location</Label>
        <RadioGroup
          value={wizard.locationType}
          onValueChange={(v) => patch({ locationType: v as LocationType })}
          className="mt-3 space-y-3"
        >
          <LocationOption value="studio" label="I work at a studio or shop" />
          <LocationOption value="mobile" label="I'm mobile / I go to clients" />
          <LocationOption value="home" label="I work from home (address kept private)" />
        </RadioGroup>

        {(wizard.locationType === "studio" || wizard.locationType === "home") && (
          <Input
            value={wizard.address}
            onChange={(e) => patch({ address: e.target.value })}
            placeholder="Street address"
            className="mt-3"
          />
        )}
      </div>
    </div>
  );
}

function LocationOption({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <RadioGroupItem value={value} id={`loc-${value}`} />
      <Label htmlFor={`loc-${value}`} className="font-normal">
        {label}
      </Label>
    </div>
  );
}

function TimeSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9 w-32">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {TIME_OPTIONS.map((t) => (
          <SelectItem key={t.value} value={t.value}>
            {t.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ---------- Step 6 ----------
function StepPolicies({ wizard, patch }: StepProps) {
  const pol = wizard.policies;
  const set = (p: Partial<WizardState["policies"]>) => patch({ policies: { ...pol, ...p } });
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Set your booking rules</h1>
      <p className="mt-1 text-sm text-muted-foreground">These appear in your Booking Policy section.</p>

      <div className="mt-6 space-y-5">
        <div>
          <Label>Non-refundable deposit required to book ($)</Label>
          <Input
            type="number"
            min="0"
            value={pol.deposit}
            onChange={(e) => set({ deposit: e.target.value })}
            className="mt-1.5"
          />
        </div>
        <div>
          <Label>Cancellation window</Label>
          <Select value={pol.cancellation} onValueChange={(v) => set({ cancellation: v })}>
            <SelectTrigger className="mt-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CANCELLATION_OPTIONS.map((o) => (
                <SelectItem key={o} value={o}>
                  {o}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Late arrival grace period</Label>
          <Select value={pol.grace} onValueChange={(v) => set({ grace: v })}>
            <SelectTrigger className="mt-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {GRACE_OPTIONS.map((o) => (
                <SelectItem key={o} value={o}>
                  {o}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
          <Label className="font-normal">No additional guests allowed</Label>
          <Switch checked={pol.noGuests} onCheckedChange={(v) => set({ noGuests: v })} />
        </div>
        <div>
          <Label>Custom policy note (optional)</Label>
          <Textarea
            value={pol.customNote}
            onChange={(e) => set({ customNote: e.target.value })}
            placeholder="Any extra rules clients should know."
            className="mt-1.5"
          />
        </div>
      </div>
    </div>
  );
}

// ---------- Step 7 ----------
function StepIntake({ wizard, patch }: StepProps) {
  const industry = getIndustry(wizard.industry);

  function ensureSuggestions() {
    if (wizard.intake.length === 0) {
      patch({
        intake: industry.intake.map((q) => ({ id: uid(), label: q.label, type: q.type })),
      });
    }
  }
  // populate suggestions on first render
  useEffect(() => {
    ensureSuggestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function update(id: string, p: Partial<WizardState["intake"][number]>) {
    patch({ intake: wizard.intake.map((q) => (q.id === id ? { ...q, ...p } : q)) });
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">
        What do you need to know before the appointment?
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">Clients answer these when they book.</p>

      <div className="mt-6 space-y-3">
        {wizard.intake.map((q) => (
          <div key={q.id} className="flex items-center gap-2 rounded-lg border border-border p-3">
            <Input
              value={q.label}
              onChange={(e) => update(q.id, { label: e.target.value })}
              placeholder="Question"
              className="flex-1"
            />
            <Select value={q.type} onValueChange={(v) => update(q.id, { type: v as IntakeType })}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(INTAKE_TYPE_LABELS) as IntakeType[]).map((t) => (
                  <SelectItem key={t} value={t}>
                    {INTAKE_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <button
              onClick={() => patch({ intake: wizard.intake.filter((x) => x.id !== q.id) })}
              className="text-muted-foreground hover:text-destructive"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}

        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() =>
              patch({ intake: [...wizard.intake, { id: uid(), label: "", type: "short" }] })
            }
          >
            <Plus className="mr-1.5 h-4 w-4" /> Add Question
          </Button>
          <button
            onClick={() => patch({ intake: [] })}
            className="text-sm text-muted-foreground hover:underline"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- Step 8 ----------
function StepPreview({
  wizard,
  navigate,
}: {
  wizard: WizardState;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const save = useServerFn(completeOnboarding);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [slug, setSlug] = useState<string | null>(null);
  const [saving, setSaving] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    save({
      data: {
        industry: (wizard.industry ?? "other") as IndustryId,
        themeId: wizard.themeId,
        businessName: wizard.businessName,
        ownerTitle: wizard.ownerTitle,
        bio: wizard.bio,
        logoUrl: wizard.logoUrl ?? null,
        primaryColor: wizard.primaryColor,
        secondaryColor: wizard.secondaryColor,
        portfolioUrls: wizard.portfolio.map((p) => p.url).filter((u): u is string => !!u),
        services: wizard.services
          .filter((s) => s.name.trim())
          .map((s) => ({
            name: s.name.trim(),
            description: s.description.trim(),
            durationMinutes: durationToMinutes(s),
            priceCents: Math.round((parseFloat(s.price) || 0) * 100),
            options: s.options
              .filter((o) => o.label.trim())
              .map((o) => ({ label: o.label.trim(), price: parseFloat(o.price) || 0 })),
          })),
        hours: wizard.hours.map((h) => ({ dow: h.dow, open: h.open, start: h.start, end: h.end })),
        location: { type: wizard.locationType, address: wizard.address.trim() },
        businessPhone: wizard.businessPhone.trim(),
        businessEmail: wizard.businessEmail.trim(),
        businessWebsite: wizard.businessWebsite.trim(),
        policies: {
          deposit: parseFloat(wizard.policies.deposit) || 0,
          cancellation: wizard.policies.cancellation,
          grace: wizard.policies.grace,
          noGuests: wizard.policies.noGuests,
          customNote: wizard.policies.customNote.trim(),
        },
        intake: wizard.intake
          .filter((q) => q.label.trim())
          .map((q) => ({ label: q.label.trim(), type: q.type })),
      },
    })
      .then((res) => setSlug(res.slug))
      .catch((e) => setSaveError(e?.message ?? "Could not save. Please try again."))
      .finally(() => setSaving(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pick(n: number) {
    setRating(n);
    if (n >= 4) {
      confetti({ particleCount: 140, spread: 75, origin: { y: 0.6 } });
    }
  }

  const highRated = rating >= 4;
  const lowRated = rating > 0 && rating < 4;

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Here's your booking site.</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {saving ? "Saving your site…" : "Take a look — this is what your clients will see."}
      </p>

      <div className="mt-6 lg:hidden">
        <LivePreview wizard={wizard} large />
      </div>

      {saveError && <p className="mt-4 text-sm text-destructive">{saveError}</p>}

      <div className="mt-8 rounded-2xl border border-border p-6 text-center">
        <p className="text-base font-semibold">How do you feel about your design?</p>
        <div className="mt-4 flex justify-center gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => pick(n)}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              aria-label={`${n} star`}
            >
              <Star
                className={`h-8 w-8 transition-colors ${
                  n <= (hover || rating)
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-muted-foreground"
                }`}
              />
            </button>
          ))}
        </div>

        {highRated && (
          <div className="mt-6">
            <p className="flex items-center justify-center gap-2 text-sm font-medium text-foreground">
              <Check className="h-4 w-4 text-green-500" /> You're all set! Your site is ready at{" "}
              <span className="font-semibold">procschedule.com/{slug ?? "your-business"}</span>
            </p>
            <Button className="mt-4" onClick={() => navigate({ to: "/pricing" })}>
              Choose your plan
            </Button>
          </div>
        )}

        {lowRated && (
          <div className="mt-6 space-y-3">
            <p className="text-sm text-muted-foreground">
              No problem — let's make it perfect. Schedule a design session and I'll personally
              update your site.
            </p>
            <div className="flex flex-col items-center gap-2">
              <Button onClick={() => window.open(CALENDLY_URL, "_blank", "noopener,noreferrer")}>
                Schedule a design call
              </Button>
              <Button variant="ghost" onClick={() => navigate({ to: "/pricing" })}>
                Choose your plan
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Optional Done-For-You Design upsell */}
      <div className="mt-6 rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-white p-6">
        <p className="text-base font-semibold">Want us to build it for you?</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Your wizard-built site is ready and included free. For a one-time $100 Done-For-You Design, we'll personally
          craft custom layouts, premium design, and brand consultation — competitors charge $500–$2,000+ for this.
        </p>
        <Button variant="outline" className="mt-4" onClick={() => navigate({ to: "/pricing" })}>
          Add Done-For-You Design — $100
        </Button>
      </div>
    </div>

  );
}
