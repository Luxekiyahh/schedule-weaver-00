import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import confetti from "canvas-confetti";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronUp,
  Loader2,
  LogOut,
  Plus,
  Star,
  Trash2,
  Upload,
  UserCheck,
  X,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { resolveHomePathForUser, signOutAndReset } from "@/lib/auth-signout";
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
  type ServiceCategory,
} from "@/components/onboarding/wizard-config";

export const Route = createFileRoute("/onboarding")({
  component: OnboardingWizard,
  head: () => ({
    meta: [
      { title: "Create your account & booking site — ProcSchedule" },
      {
        name: "description",
        content:
          "Sign up and build your branded booking site in a few quick steps — account, industry, brand, services, availability, and publish.",
      },
    ],
  }),
});

const STEP_LABELS = [
  "Account",
  "Industry",
  "Brand",
  "Services",
  "Availability",
  "Review",
];
const TOTAL_STEPS = STEP_LABELS.length;

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

  const [checkingSession, setCheckingSession] = useState(true);
  const [existingUser, setExistingUser] = useState<{ id: string; email: string | null } | null>(null);
  const [existingOnboarded, setExistingOnboarded] = useState(false);

  const getCtx = useServerFn(getOnboardingContext);

  useEffect(() => {
    let cancelled = false;
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
          setExistingUser(user);
          setExistingOnboarded(true);
        } else {
          setWorkspaceId(ctx.workspaceId);
          setHasAccount(true);
          setWizard((w) => (w.businessName ? w : { ...w, businessName: ctx.name ?? "" }));
          setStep((s) => (s === 1 ? 2 : s));
        }
      } catch {
        // signed in, no workspace yet
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
    setStep((s) => Math.min(TOTAL_STEPS, s + 1));
  }
  function back() {
    setError(null);
    if (step <= 1) {
      navigate({ to: "/" });
      return;
    }
    const floor = hasAccount ? 2 : 1;
    if (step <= floor) {
      navigate({ to: "/" });
      return;
    }
    setStep((s) => Math.max(floor, s - 1));
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
      {checkingSession && (
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}
      {!checkingSession && existingUser && existingOnboarded && (
        <SignedInGate user={existingUser} navigate={navigate} />
      )}
      {!checkingSession && !(existingUser && existingOnboarded) && (
        <OnboardingBody
          step={step}
          setStep={setStep}
          wizard={wizard}
          patch={patch}
          workspaceId={workspaceId}
          hasAccount={hasAccount}
          error={error}
          next={next}
          back={back}
          navigate={navigate}
          onAccountCreated={onAccountCreated}
        />
      )}
    </div>
  );
}

function SignedInGate({
  user,
  navigate,
}: {
  user: { id: string; email: string | null };
  navigate: ReturnType<typeof useNavigate>;
}) {
  const queryClient = useQueryClient();
  const [continuing, setContinuing] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  async function handleContinue() {
    setContinuing(true);
    try {
      const dest = await resolveHomePathForUser(user.id);
      navigate({ to: dest });
    } finally {
      setContinuing(false);
    }
  }

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOutAndReset(queryClient);
      window.location.reload();
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-7 shadow-sm">
        <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/40 px-3.5 py-3">
          <UserCheck className="h-5 w-5 mt-0.5 shrink-0 text-foreground" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">You're already signed in</p>
            <p className="text-sm text-muted-foreground truncate">{user.email ?? "Signed-in account"}</p>
          </div>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          Your business is already set up. Continue to your dashboard, or sign out first if you're
          setting up a different account on this device.
        </p>
        <Button type="button" onClick={handleContinue} disabled={continuing || signingOut} className="mt-5 w-full">
          {continuing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Continue to your dashboard
        </Button>
        <Button type="button" variant="outline" onClick={handleSignOut} disabled={continuing || signingOut} className="mt-2 w-full">
          {signingOut ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogOut className="mr-2 h-4 w-4" />}
          Sign out & set up a new business
        </Button>
      </div>
    </div>
  );
}

function OnboardingBody({
  step,
  setStep: _setStep,
  wizard,
  patch,
  workspaceId,
  hasAccount,
  error,
  next,
  back,
  navigate,
  onAccountCreated,
}: {
  step: number;
  setStep: (s: number | ((prev: number) => number)) => void;
  wizard: WizardState;
  patch: (p: Partial<WizardState>) => void;
  workspaceId: string | null;
  hasAccount: boolean;
  error: string | null;
  next: () => void;
  back: () => void;
  navigate: ReturnType<typeof useNavigate>;
  onAccountCreated: (ctx: { workspaceId: string; businessName: string }) => void;
}) {
  const canGoBack = step > 1 && (!hasAccount || step > 2);
  const backLabel = canGoBack ? "Back" : "Back to home";
  const pct = Math.round(((step - 1) / (TOTAL_STEPS - 1)) * 100);
  const showLivePreview = step >= 3 && step <= 5;

  return (
    <>
      {/* Sticky top bar with Back + horologe progress */}
      <div className="sticky top-0 z-10 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto max-w-7xl px-3 py-3 sm:px-4">
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={back}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground/80 transition-colors hover:border-primary/60 hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{backLabel}</span>
              <span className="sm:hidden">Back</span>
            </button>
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Step {step} of {TOTAL_STEPS} · <span className="text-foreground">{STEP_LABELS[step - 1]}</span>
            </p>
            <span className="w-16 text-right text-[11px] tabular-nums text-muted-foreground">{pct}%</span>
          </div>
          <div className="mt-2.5 h-[3px] w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary/70 via-primary to-primary/70 transition-[width] duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>

      <div className={`mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 py-8 ${showLivePreview ? "lg:grid-cols-2" : ""}`}>
        <div className="order-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2 }}
              className="rounded-2xl border border-border bg-card/60 p-5 shadow-[0_1px_0_hsl(var(--border))] sm:p-7"
            >
              {step === 1 && <StepAccount onCreated={onAccountCreated} />}
              {step === 2 && <StepIndustry wizard={wizard} patch={patch} onPick={() => setTimeout(next, 120)} />}
              {step === 3 && <StepBrand wizard={wizard} patch={patch} workspaceId={workspaceId} />}
              {step === 4 && <StepServices wizard={wizard} patch={patch} />}
              {step === 5 && <StepAvailability wizard={wizard} patch={patch} />}
              {step === 6 && <StepReview wizard={wizard} patch={patch} navigate={navigate} />}
            </motion.div>
          </AnimatePresence>

          {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

          {step > 1 && step < TOTAL_STEPS && step !== 2 && (
            <div className="mt-6 flex items-center justify-between">
              <Button variant="ghost" onClick={back}>
                <ArrowLeft className="mr-1.5 h-4 w-4" /> Back
              </Button>
              <Button onClick={next}>
                Continue <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {showLivePreview && (
          <div className="order-2 lg:sticky lg:top-24 lg:self-start">
            <LivePreview wizard={wizard} />
          </div>
        )}
      </div>
    </>
  );
}

type StepProps = {
  wizard: WizardState;
  patch: (p: Partial<WizardState>) => void;
};

// ---------- Step 1: Account ----------
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
  const [slugStatus, setSlugStatus] = useState<"idle" | "checking" | "ok" | "taken" | "invalid">("idle");
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
    !loading && !!email && password.length >= 8 && !!businessName.trim() && slugStatus === "ok";

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

      await finalize({ data: { businessName: businessName.trim(), slug } });

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
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Create your account</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Your branded booking page will live at <span className="font-mono text-foreground/80">procschedule.com/your-name</span>
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
              {slugStatus === "checking" && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              {slugStatus === "ok" && <Check className="h-4 w-4 text-green-600" />}
              {(slugStatus === "taken" || slugStatus === "invalid") && <X className="h-4 w-4 text-destructive" />}
            </div>
          </div>
          {slugStatus === "taken" && <p className="mt-1 text-xs text-destructive">This URL is taken.</p>}
          {slugStatus === "invalid" && (
            <p className="mt-1 text-xs text-destructive">Use lowercase letters, numbers, and hyphens (min 2).</p>
          )}
        </div>

        <div>
          <Label htmlFor="acct-email">Email</Label>
          <Input id="acct-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@business.com" className="mt-1.5" required />
        </div>

        <div>
          <Label htmlFor="acct-pw">Password</Label>
          <Input id="acct-pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" minLength={8} className="mt-1.5" required />
        </div>

        {error && <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}

        <Button type="submit" disabled={!canSubmit} className="w-full">
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Create account & continue
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <a href="/login" className="text-primary hover:underline">Sign in</a>
        </p>
      </div>
    </form>
  );
}

// ---------- Step 2: Industry ----------
function StepIndustry({ wizard, patch, onPick }: StepProps & { onPick: () => void }) {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">What kind of business do you run?</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">We'll tailor your setup based on your industry. Tap one to continue.</p>
      <div className="mt-6 grid grid-cols-2 gap-3">
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
                selected ? "border-primary bg-primary/10 ring-1 ring-primary" : "border-border"
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

// ---------- Step 3: Brand (Identity + Photos + Colors + Theme) ----------
function StepBrand({ wizard, patch, workspaceId }: StepProps & { workspaceId: string | null }) {
  const industry = getIndustry(wizard.industry);
  const upload = useServerFn(uploadOnboardingImage);
  const [uploading, setUploading] = useState(false);
  const [detected, setDetected] = useState(false);
  const logoRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const wizardRef = useRef(wizard);
  wizardRef.current = wizard;

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
          data: { workspaceId, kind: "logo", fileName: file.name, contentType: file.type || "image/png", dataBase64: base64 },
        });
        patch({ logoUrl: res.url });
      }
    } finally {
      setUploading(false);
    }
  }

  async function addPhotos(files: FileList) {
    const remaining = 9 - wizard.portfolio.length;
    const list = Array.from(files).slice(0, remaining);
    for (const f of list) {
      const id = uid();
      const { base64, dataUrl } = await fileToBase64(f);
      patch({ portfolio: [...wizardRef.current.portfolio, { id, dataUrl }] });
      if (workspaceId) {
        try {
          const res = await upload({
            data: { workspaceId, kind: "portfolio", fileName: f.name, contentType: f.type || "image/jpeg", dataBase64: base64 },
          });
          patch({ portfolio: wizardRef.current.portfolio.map((p) => (p.id === id ? { ...p, url: res.url } : p)) });
        } catch {
          /* ignore */
        }
      }
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Your brand</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">Name, photos, and colors — all in one place.</p>

      <div className="mt-6 space-y-6">
        {/* Identity */}
        <section className="space-y-4">
          <div>
            <Label htmlFor="bn">Business Name</Label>
            <Input id="bn" value={wizard.businessName} onChange={(e) => patch({ businessName: e.target.value })} placeholder="e.g. Dolliimarie Hair Studio" className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="title">Your Name / Title</Label>
            <Input id="title" value={wizard.ownerTitle} onChange={(e) => patch({ ownerTitle: e.target.value })} placeholder="e.g. Melanie, Lead Stylist" className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="bio">Short Bio or Tagline</Label>
            <Textarea id="bio" value={wizard.bio} maxLength={160} onChange={(e) => patch({ bio: e.target.value })} placeholder={industry.bioPlaceholder} className="mt-1.5" />
            <p className="mt-1 text-right text-xs text-muted-foreground">{wizard.bio.length}/160</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="biz-phone">Business phone</Label>
              <Input id="biz-phone" value={wizard.businessPhone} onChange={(e) => patch({ businessPhone: e.target.value })} placeholder="(555) 123-4567" className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="biz-email">Contact email</Label>
              <Input id="biz-email" value={wizard.businessEmail} onChange={(e) => patch({ businessEmail: e.target.value })} placeholder="hello@yourbusiness.com" className="mt-1.5" />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="biz-website">Website (optional)</Label>
              <Input id="biz-website" value={wizard.businessWebsite} onChange={(e) => patch({ businessWebsite: e.target.value })} placeholder="www.yourbusiness.com" className="mt-1.5" />
            </div>
          </div>
        </section>

        {/* Logo + colors */}
        <section className="rounded-xl border border-border p-4">
          <p className="text-sm font-semibold">Logo & colors</p>
          <input
            ref={logoRef}
            type="file"
            accept="image/png,image/jpeg,image/svg+xml"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onLogo(f);
            }}
          />
          <div className="mt-3 flex items-center gap-4">
            <button
              type="button"
              onClick={() => logoRef.current?.click()}
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
              Upload a logo — we'll pull your brand colors automatically.
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-6">
            <ColorField label="Primary" value={wizard.primaryColor} onChange={(v) => patch({ primaryColor: v })} />
            <ColorField label="Secondary" value={wizard.secondaryColor} onChange={(v) => patch({ secondaryColor: v })} />
            {detected && <span className="self-center text-xs text-muted-foreground">Detected from logo — tweak if needed.</span>}
          </div>
        </section>

        {/* Photos */}
        <section>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold">Portfolio photos</p>
            <p className="text-xs text-muted-foreground">{wizard.portfolio.length}/9</p>
          </div>
          <input
            ref={photoRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && addPhotos(e.target.files)}
          />
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {Array.from({ length: 9 }).map((_, i) => {
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
                  onClick={() => isNext && photoRef.current?.click()}
                  className={`flex aspect-square items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 ${
                    isNext ? "hover:border-primary/60" : "cursor-default opacity-60"
                  }`}
                >
                  {isNext && <Plus className="h-5 w-5 text-muted-foreground" />}
                </button>
              );
            })}
          </div>
        </section>

        {/* Theme */}
        <section className="rounded-xl border border-border p-4">
          <p className="text-sm font-semibold">Storefront theme</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Pre-selected for your industry — change anytime.</p>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
            {THEMES.map((t) => {
              const active = wizard.themeId === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => patch({ themeId: t.id as ThemeId })}
                  className={`flex flex-col gap-2 rounded-xl border p-3 text-left transition-all hover:border-primary/60 ${
                    active ? "border-primary bg-primary/10 ring-1 ring-primary" : "border-border"
                  }`}
                >
                  <div className="flex gap-1.5">
                    {t.swatch.map((c) => (
                      <span key={c} className="h-5 w-5 rounded-full border border-black/10" style={{ backgroundColor: c }} />
                    ))}
                  </div>
                  <span className="text-sm font-semibold">{t.label}</span>
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <label className="relative h-9 w-9 cursor-pointer overflow-hidden rounded-lg border border-border">
        <span className="block h-full w-full" style={{ backgroundColor: value }} />
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" />
      </label>
      <div className="text-xs">
        <p className="font-medium">{label}</p>
        <p className="uppercase text-muted-foreground">{value}</p>
      </div>
    </div>
  );
}

// ---------- Step 4: Services (Categories + Services + Add-ons) ----------
function StepServices({ wizard, patch }: StepProps) {
  const industry = getIndustry(wizard.industry);
  const placeholders = industry.services;

  // Seed a default category once, on first render if none exist.
  useEffect(() => {
    if (wizard.categories.length === 0) {
      const cat: ServiceCategory = { id: uid(), name: `${industry.label} Services` };
      const services = wizard.services.length
        ? wizard.services.map((s) => (s.categoryId ? s : { ...s, categoryId: cat.id }))
        : wizard.services;
      patch({ categories: [cat], services });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cats = wizard.categories;
  const singleCat = cats.length <= 1;

  function updateService(id: string, p: Partial<WizardState["services"][number]>) {
    patch({ services: wizard.services.map((s) => (s.id === id ? { ...s, ...p } : s)) });
  }

  function addCategory() {
    const cat: ServiceCategory = { id: uid(), name: `New Category` };
    patch({ categories: [...cats, cat] });
  }

  function renameCategory(id: string, name: string) {
    patch({ categories: cats.map((c) => (c.id === id ? { ...c, name } : c)) });
  }

  function removeCategory(id: string) {
    if (cats.length <= 1) return;
    const fallback = cats.find((c) => c.id !== id)!.id;
    patch({
      categories: cats.filter((c) => c.id !== id),
      services: wizard.services.map((s) => (s.categoryId === id ? { ...s, categoryId: fallback } : s)),
    });
  }

  function addService(categoryId: string) {
    const count = wizard.services.length;
    patch({
      services: [
        ...wizard.services,
        emptyService(placeholders[count % placeholders.length] ?? "", categoryId),
      ],
    });
  }

  function addAddOn(serviceId: string) {
    const svc = wizard.services.find((s) => s.id === serviceId);
    if (!svc) return;
    updateService(serviceId, {
      addOns: [...svc.addOns, { id: uid(), name: "", price: "", duration: "" }],
    });
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Services you offer</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">Group them into categories and add extras clients can tack on.</p>

      {/* Categories strip */}
      <div className="mt-5 rounded-xl border border-border bg-muted/30 p-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Categories</p>
          <button onClick={addCategory} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
            <Plus className="h-3.5 w-3.5" /> Add category
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {cats.map((c) => (
            <div key={c.id} className="group flex items-center gap-1 rounded-full border border-border bg-card px-1 py-1">
              <input
                value={c.name}
                onChange={(e) => renameCategory(c.id, e.target.value)}
                className="min-w-0 max-w-[10rem] bg-transparent px-2 text-sm outline-none focus:ring-0"
              />
              {!singleCat && (
                <button onClick={() => removeCategory(c.id)} className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Services grouped by category */}
      <div className="mt-6 space-y-6">
        {cats.map((cat) => {
          const catServices = wizard.services.filter((s) => (s.categoryId ?? cats[0]?.id) === cat.id);
          return (
            <div key={cat.id}>
              {!singleCat && (
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground">{cat.name || "Untitled category"}</p>
                  <p className="text-xs text-muted-foreground">{catServices.length} service{catServices.length === 1 ? "" : "s"}</p>
                </div>
              )}
              <div className="space-y-4">
                {catServices.map((s, idx) => (
                  <ServiceCard
                    key={s.id}
                    service={s}
                    index={idx}
                    placeholder={placeholders[idx % placeholders.length] ?? ""}
                    onChange={(p) => updateService(s.id, p)}
                    onDelete={() => patch({ services: wizard.services.filter((x) => x.id !== s.id) })}
                    onAddAddOn={() => addAddOn(s.id)}
                    categories={cats}
                    showCategoryPicker={!singleCat}
                  />
                ))}
                <Button variant="outline" size="sm" onClick={() => addService(cat.id)}>
                  <Plus className="mr-1.5 h-4 w-4" /> Add service{!singleCat && ` to ${cat.name || "category"}`}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ServiceCard({
  service: s,
  placeholder,
  onChange,
  onDelete,
  onAddAddOn,
  categories,
  showCategoryPicker,
}: {
  service: WizardState["services"][number];
  index: number;
  placeholder: string;
  onChange: (p: Partial<WizardState["services"][number]>) => void;
  onDelete: () => void;
  onAddAddOn: () => void;
  categories: ServiceCategory[];
  showCategoryPicker: boolean;
}) {
  const [addOnsOpen, setAddOnsOpen] = useState(s.addOns.length > 0);
  return (
    <div className="rounded-xl border border-border bg-background/60 p-4">
      <div className="flex items-start gap-3">
        <div className="flex-1 space-y-3">
          <Input value={s.name} onChange={(e) => onChange({ name: e.target.value })} placeholder={placeholder} />
          <Textarea
            value={s.description}
            onChange={(e) => onChange({ description: e.target.value })}
            placeholder="Description (optional)"
            className="min-h-[60px]"
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Duration</Label>
              <Select value={s.duration} onValueChange={(v) => onChange({ duration: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DURATION_OPTIONS.map((d) => (
                    <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Price ($)</Label>
              <Input type="number" min="0" value={s.price} onChange={(e) => onChange({ price: e.target.value })} placeholder="0" className="mt-1" />
            </div>
          </div>
          {s.duration === "custom" && (
            <div>
              <Label className="text-xs">Custom duration (minutes)</Label>
              <Input type="number" min="1" value={s.customDuration} onChange={(e) => onChange({ customDuration: e.target.value })} placeholder="e.g. 75" className="mt-1" />
            </div>
          )}

          {showCategoryPicker && (
            <div>
              <Label className="text-xs">Category</Label>
              <Select value={s.categoryId ?? undefined} onValueChange={(v) => onChange({ categoryId: v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Pick a category" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name || "Untitled"}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Add-ons */}
          <div className="rounded-lg border border-dashed border-border bg-muted/20 p-3">
            <button
              type="button"
              onClick={() => setAddOnsOpen((o) => !o)}
              className="flex w-full items-center justify-between text-left"
            >
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Add-ons {s.addOns.length > 0 && <span className="ml-1 text-foreground">({s.addOns.length})</span>}
              </span>
              {addOnsOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </button>
            {addOnsOpen && (
              <div className="mt-3 space-y-2">
                {s.addOns.map((a) => (
                  <div key={a.id} className="flex flex-wrap items-center gap-2">
                    <Input
                      value={a.name}
                      onChange={(e) => onChange({ addOns: s.addOns.map((x) => (x.id === a.id ? { ...x, name: e.target.value } : x)) })}
                      placeholder="Add-on name (e.g. Scalp treatment)"
                      className="min-w-[10rem] flex-1"
                    />
                    <Input
                      type="number"
                      min="0"
                      value={a.price}
                      onChange={(e) => onChange({ addOns: s.addOns.map((x) => (x.id === a.id ? { ...x, price: e.target.value } : x)) })}
                      placeholder="+$"
                      className="w-20"
                    />
                    <Input
                      type="number"
                      min="0"
                      value={a.duration}
                      onChange={(e) => onChange({ addOns: s.addOns.map((x) => (x.id === a.id ? { ...x, duration: e.target.value } : x)) })}
                      placeholder="+min"
                      className="w-20"
                    />
                    <button
                      onClick={() => onChange({ addOns: s.addOns.filter((x) => x.id !== a.id) })}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <button onClick={onAddAddOn} className="text-xs font-medium text-primary hover:underline">
                  + Add add-on
                </button>
              </div>
            )}
          </div>
        </div>
        <button onClick={onDelete} className="text-muted-foreground hover:text-destructive" aria-label="Remove service">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ---------- Step 5: Availability (Hours + Location + Policies) ----------
function StepAvailability({ wizard, patch }: StepProps) {
  function updateDay(dow: number, p: Partial<WizardState["hours"][number]>) {
    patch({ hours: wizard.hours.map((h) => (h.dow === dow ? { ...h, ...p } : h)) });
  }
  const pol = wizard.policies;
  const setPol = (p: Partial<WizardState["policies"]>) => patch({ policies: { ...pol, ...p } });

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">When & where you work</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">Hours, location, and your booking rules.</p>

      <div className="mt-6 space-y-6">
        {/* Hours */}
        <section>
          <p className="mb-3 text-sm font-semibold">Weekly hours</p>
          <div className="space-y-2">
            {DAYS.map((d) => {
              const h = wizard.hours.find((x) => x.dow === d.dow)!;
              return (
                <div key={d.dow} className="flex flex-wrap items-center gap-3 rounded-lg border border-border px-3 py-2">
                  <div className="flex w-28 items-center gap-2">
                    <Switch checked={h.open} onCheckedChange={(v) => updateDay(d.dow, { open: v })} />
                    <span className="text-sm font-medium">{d.short}</span>
                  </div>
                  {h.open ? (
                    <div className="flex flex-1 items-center gap-2">
                      <TimeSelect value={h.start} onChange={(v) => updateDay(d.dow, { start: v })} />
                      <span className="text-muted-foreground">–</span>
                      <TimeSelect value={h.end} onChange={(v) => updateDay(d.dow, { end: v })} />
                    </div>
                  ) : (
                    <span className="flex-1 text-sm text-muted-foreground">Closed</span>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Location */}
        <section>
          <p className="mb-3 text-sm font-semibold">Location</p>
          <RadioGroup value={wizard.locationType} onValueChange={(v) => patch({ locationType: v as LocationType })} className="space-y-2">
            <LocationOption value="studio" label="I work at a studio or shop" />
            <LocationOption value="mobile" label="I'm mobile / I go to clients" />
            <LocationOption value="home" label="I work from home (address kept private)" />
          </RadioGroup>
          {(wizard.locationType === "studio" || wizard.locationType === "home") && (
            <Input value={wizard.address} onChange={(e) => patch({ address: e.target.value })} placeholder="Street address" className="mt-3" />
          )}
        </section>

        {/* Policies */}
        <section className="space-y-4">
          <p className="text-sm font-semibold">Booking rules</p>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label className="text-xs">Deposit ($)</Label>
              <Input type="number" min="0" value={pol.deposit} onChange={(e) => setPol({ deposit: e.target.value })} className="mt-1.5" />
            </div>
            <div>
              <Label className="text-xs">Cancellation window</Label>
              <Select value={pol.cancellation} onValueChange={(v) => setPol({ cancellation: v })}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CANCELLATION_OPTIONS.map((o) => (<SelectItem key={o} value={o}>{o}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Grace period</Label>
              <Select value={pol.grace} onValueChange={(v) => setPol({ grace: v })}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {GRACE_OPTIONS.map((o) => (<SelectItem key={o} value={o}>{o}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
            <Label className="font-normal">No additional guests allowed</Label>
            <Switch checked={pol.noGuests} onCheckedChange={(v) => setPol({ noGuests: v })} />
          </div>
          <div>
            <Label className="text-xs">Custom note (optional)</Label>
            <Textarea value={pol.customNote} onChange={(e) => setPol({ customNote: e.target.value })} placeholder="Any extra rules clients should know." className="mt-1.5" />
          </div>
        </section>
      </div>
    </div>
  );
}

function LocationOption({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <RadioGroupItem value={value} id={`loc-${value}`} />
      <Label htmlFor={`loc-${value}`} className="font-normal">{label}</Label>
    </div>
  );
}

function TimeSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9 w-32"><SelectValue /></SelectTrigger>
      <SelectContent>
        {TIME_OPTIONS.map((t) => (<SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>))}
      </SelectContent>
    </Select>
  );
}

// ---------- Step 6: Review + Intake + Publish ----------
function StepReview({
  wizard,
  patch,
  navigate,
}: {
  wizard: WizardState;
  patch: (p: Partial<WizardState>) => void;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const industry = getIndustry(wizard.industry);
  const save = useServerFn(completeOnboarding);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [slug, setSlug] = useState<string | null>(null);
  const [saving, setSaving] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [intakeOpen, setIntakeOpen] = useState(false);

  useEffect(() => {
    if (wizard.intake.length === 0) {
      patch({ intake: industry.intake.map((q) => ({ id: uid(), label: q.label, type: q.type })) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        categories: wizard.categories.map((c, i) => ({ id: c.id, name: c.name.trim() || `Category ${i + 1}`, sort: i })),
        services: wizard.services
          .filter((s) => s.name.trim())
          .map((s) => ({
            name: s.name.trim(),
            description: s.description.trim(),
            durationMinutes: durationToMinutes(s),
            priceCents: Math.round((parseFloat(s.price) || 0) * 100),
            categoryId: s.categoryId,
            options: s.options
              .filter((o) => o.label.trim())
              .map((o) => ({ label: o.label.trim(), price: parseFloat(o.price) || 0 })),
            addOns: s.addOns
              .filter((a) => a.name.trim())
              .map((a) => ({
                name: a.name.trim(),
                priceCents: Math.round((parseFloat(a.price) || 0) * 100),
                durationMinutes: Math.max(0, parseInt(a.duration, 10) || 0),
              })),
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
    if (n >= 4) confetti({ particleCount: 140, spread: 75, origin: { y: 0.6 } });
  }
  const highRated = rating >= 4;
  const lowRated = rating > 0 && rating < 4;

  function updateIntake(id: string, p: Partial<WizardState["intake"][number]>) {
    patch({ intake: wizard.intake.map((q) => (q.id === id ? { ...q, ...p } : q)) });
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Review & publish</h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        {saving ? "Saving your site…" : "Here's what your clients will see."}
      </p>

      <div className="mt-6">
        <LivePreview wizard={wizard} large />
      </div>

      {saveError && <p className="mt-4 text-sm text-destructive">{saveError}</p>}

      {/* Advanced: intake questions */}
      <div className="mt-6 rounded-2xl border border-border">
        <button
          type="button"
          onClick={() => setIntakeOpen((o) => !o)}
          className="flex w-full items-center justify-between px-5 py-4 text-left"
        >
          <div>
            <p className="text-sm font-semibold">Advanced: pre-booking questions</p>
            <p className="text-xs text-muted-foreground">Optional — ask clients things before they book.</p>
          </div>
          {intakeOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {intakeOpen && (
          <div className="space-y-3 border-t border-border p-5">
            {wizard.intake.map((q) => (
              <div key={q.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-3">
                <Input value={q.label} onChange={(e) => updateIntake(q.id, { label: e.target.value })} placeholder="Question" className="min-w-[10rem] flex-1" />
                <Select value={q.type} onValueChange={(v) => updateIntake(q.id, { type: v as IntakeType })}>
                  <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(INTAKE_TYPE_LABELS) as IntakeType[]).map((t) => (
                      <SelectItem key={t} value={t}>{INTAKE_TYPE_LABELS[t]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <button onClick={() => patch({ intake: wizard.intake.filter((x) => x.id !== q.id) })} className="text-muted-foreground hover:text-destructive">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => patch({ intake: [...wizard.intake, { id: uid(), label: "", type: "short" }] })}>
              <Plus className="mr-1.5 h-4 w-4" /> Add question
            </Button>
          </div>
        )}
      </div>

      <div className="mt-6 rounded-2xl border border-border p-6 text-center">
        <p className="text-base font-semibold">How do you feel about your design?</p>
        <div className="mt-4 flex justify-center gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} onClick={() => pick(n)} onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)} aria-label={`${n} star`}>
              <Star className={`h-8 w-8 transition-colors ${n <= (hover || rating) ? "fill-primary text-primary" : "text-muted-foreground"}`} />
            </button>
          ))}
        </div>

        {highRated && (
          <div className="mt-6">
            <p className="flex items-center justify-center gap-2 text-sm font-medium text-foreground">
              <Check className="h-4 w-4 text-green-500" /> Your site is ready at{" "}
              <span className="font-semibold">procschedule.com/{slug ?? "your-business"}</span>
            </p>
            <Button className="mt-4" onClick={() => navigate({ to: "/pricing" })}>Choose your plan</Button>
          </div>
        )}

        {lowRated && (
          <div className="mt-6 space-y-3">
            <p className="text-sm text-muted-foreground">
              No problem — let's make it perfect. Schedule a design session and we'll personally update your site.
            </p>
            <div className="flex flex-col items-center gap-2">
              <Button onClick={() => window.open(CALENDLY_URL, "_blank", "noopener,noreferrer")}>Schedule a design call</Button>
              <Button variant="ghost" onClick={() => navigate({ to: "/pricing" })}>Choose your plan</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
