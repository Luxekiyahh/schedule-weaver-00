import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  DEFAULT_THEME,
  generateThemeFromPrompt,
  normalizeTheme,
  fontClass,
  cardRadius,
  layoutPadding,
  type ThemeConfig,
} from "@/lib/theme";
import { Sparkles, Loader2, Save, Clock, Check, Palette, Type, LayoutGrid } from "lucide-react";
import { TENANT_ROOT_DOMAIN } from "@/lib/subdomain";

export const Route = createFileRoute("/dashboard/customize")({
  component: CustomizePage,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/onboarding" });
  },
  head: () => ({ meta: [{ title: "Customize — Dashboard" }] }),
});

const FONT_OPTIONS: ThemeConfig["font_family"][] = ["sans", "serif", "mono"];
const CARD_OPTIONS: ThemeConfig["card_style"][] = ["rounded", "soft", "sharp"];
const LAYOUT_OPTIONS: ThemeConfig["layout_mode"][] = ["clean", "compact", "editorial"];

function CustomizePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [workspaceSlug, setWorkspaceSlug] = useState<string>("");
  const [workspaceName, setWorkspaceName] = useState<string>("");
  const [prompt, setPrompt] = useState("");
  const [theme, setTheme] = useState<ThemeConfig>(DEFAULT_THEME);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data: mem } = await supabase
        .from("workspace_members")
        .select("workspace_id, workspaces(id, name, slug, theme_config)")
        .eq("user_id", u.user.id)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();
      const ws = (mem as unknown as {
        workspaces?: { id: string; name: string; slug: string; theme_config?: unknown } | null;
      })?.workspaces;
      if (ws) {
        setWorkspaceId(ws.id);
        setWorkspaceName(ws.name);
        setWorkspaceSlug(ws.slug);
        setTheme(normalizeTheme(ws.theme_config));
      }
      setLoading(false);
    })();
  }, []);

  function update<K extends keyof ThemeConfig>(key: K, value: ThemeConfig[K]) {
    setTheme((t) => ({ ...t, [key]: value }));
  }

  async function generate() {
    if (!prompt.trim()) {
      toast.error("Describe your brand vibe first");
      return;
    }
    setAiLoading(true);
    // Simulate latency so it feels like a real AI call
    await new Promise((r) => setTimeout(r, 700));
    const next = generateThemeFromPrompt(prompt);
    setTheme(next);
    setAiLoading(false);
    toast.success("Theme generated");
  }

  async function save() {
    if (!workspaceId) return;
    setSaving(true);
    const { error } = await supabase
      .from("workspaces")
      .update({ theme_config: theme })
      .eq("id", workspaceId);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Theme published");
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-10 space-y-4">
        <Skeleton className="h-9 w-1/3" />
        <Skeleton className="h-[480px] w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <header className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Customize your booking page</h1>
          <p className="text-sm text-slate-500">
            {workspaceName} · <span className="font-mono">{workspaceSlug}.{TENANT_ROOT_DOMAIN}</span>
          </p>
        </div>
        <Button onClick={save} disabled={saving} className="bg-slate-900 hover:bg-slate-800 text-white">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save & Publish
        </Button>
      </header>

      <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
        {/* LEFT PANEL */}
        <div className="space-y-5">
          {/* AI prompt */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider text-indigo-700">
              <Sparkles className="h-3 w-3" /> AI design assistant
            </div>
            <Label className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Describe your vibe
            </Label>
            <Textarea
              rows={4}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="A cozy, minimalist wellness center with earthy green tones and elegant serif fonts..."
              className="mt-2"
            />
            <Button
              onClick={generate}
              disabled={aiLoading}
              className="mt-3 w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:opacity-90"
            >
              {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Generate Theme with AI
            </Button>
          </div>

          {/* Manual controls */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-5">
            <div>
              <Label className="text-xs font-medium uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Type className="h-3.5 w-3.5" /> Hero text
              </Label>
              <Input
                value={theme.hero_text}
                onChange={(e) => update("hero_text", e.target.value)}
                className="mt-2"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <ColorField label="Primary" value={theme.primary_color} onChange={(v) => update("primary_color", v)} />
              <ColorField label="Background" value={theme.background_color} onChange={(v) => update("background_color", v)} />
            </div>

            <SegmentField
              label="Font family"
              icon={<Type className="h-3.5 w-3.5" />}
              options={FONT_OPTIONS}
              value={theme.font_family}
              onChange={(v) => update("font_family", v)}
            />
            <SegmentField
              label="Card style"
              icon={<Palette className="h-3.5 w-3.5" />}
              options={CARD_OPTIONS}
              value={theme.card_style}
              onChange={(v) => update("card_style", v)}
            />
            <SegmentField
              label="Layout"
              icon={<LayoutGrid className="h-3.5 w-3.5" />}
              options={LAYOUT_OPTIONS}
              value={theme.layout_mode}
              onChange={(v) => update("layout_mode", v)}
            />
          </div>
        </div>

        {/* RIGHT PANEL — live preview */}
        <div className="rounded-2xl border border-slate-200 bg-slate-100/60 p-4 shadow-inner">
          <div className="mb-3 flex items-center justify-between px-2">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500">Live preview</span>
            <span className="rounded-full bg-white px-2 py-0.5 text-[11px] text-slate-500 ring-1 ring-slate-200">
              /booking/{workspaceSlug || "your-slug"}
            </span>
          </div>
          <div className="overflow-hidden rounded-xl ring-1 ring-slate-200 bg-white">
            <PreviewFrame theme={theme} workspaceName={workspaceName} />
          </div>
        </div>
      </div>
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</Label>
      <div className="mt-2 flex items-center gap-2 rounded-md border border-input px-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-8 cursor-pointer rounded border-0 bg-transparent p-0"
        />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 flex-1 bg-transparent text-sm outline-none"
        />
      </div>
    </div>
  );
}

function SegmentField<T extends string>({
  label, icon, options, value, onChange,
}: { label: string; icon: React.ReactNode; options: readonly T[]; value: T; onChange: (v: T) => void }) {
  return (
    <div>
      <Label className="text-xs font-medium uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
        {icon} {label}
      </Label>
      <div className="mt-2 grid grid-cols-3 gap-1 rounded-md bg-slate-100 p-1">
        {options.map((opt) => {
          const active = opt === value;
          return (
            <button
              key={opt}
              onClick={() => onChange(opt)}
              className={`rounded px-2 py-1.5 text-xs font-medium capitalize transition ${
                active ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PreviewFrame({ theme, workspaceName }: { theme: ThemeConfig; workspaceName: string }) {
  const pad = layoutPadding(theme.layout_mode);
  const radius = cardRadius(theme.card_style);
  const font = fontClass(theme.font_family);
  const primary = theme.primary_color;

  return (
    <div className={`${font} ${pad.page} px-6`} style={{ backgroundColor: theme.background_color, minHeight: 560 }}>
      <div className="mx-auto max-w-md">
        <div className="text-center">
          <div className="mx-auto mb-3 inline-flex items-center gap-1.5 rounded-full bg-white/80 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-slate-500 ring-1 ring-slate-200">
            <Sparkles className="h-3 w-3" style={{ color: primary }} /> Book online
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">{theme.hero_text}</h2>
          <p className="mt-1 text-xs text-slate-500">{workspaceName || "Your workspace"}</p>
        </div>

        <div className={`mt-6 ${radius} bg-white ${pad.card} shadow-sm ring-1 ring-slate-200`}>
          <h3 className="text-sm font-semibold text-slate-900">Choose a service</h3>
          <div className="mt-3 space-y-2">
            {[
              { name: "Discovery Call", min: 30, price: "$50" },
              { name: "Full Session", min: 60, price: "$120" },
            ].map((s, i) => (
              <div
                key={s.name}
                className={`flex items-center justify-between gap-3 border p-3 ${cardRadius(theme.card_style)} ${
                  i === 0 ? "" : "opacity-70"
                }`}
                style={i === 0 ? { borderColor: primary } : { borderColor: "#e2e8f0" }}
              >
                <div>
                  <div className="text-sm font-medium text-slate-900">{s.name}</div>
                  <div className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-slate-500">
                    <Clock className="h-3 w-3" /> {s.min} min
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-900">{s.price}</span>
                  {i === 0 && (
                    <span
                      className="grid h-5 w-5 place-items-center rounded-full text-white"
                      style={{ backgroundColor: primary }}
                    >
                      <Check className="h-3 w-3" />
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-4 gap-1.5">
            {["9:00", "10:00", "11:00", "1:00"].map((t, i) => (
              <button
                key={t}
                className="rounded-full px-2 py-1 text-[11px] font-medium ring-1 transition"
                style={
                  i === 1
                    ? { backgroundColor: primary, color: "#fff", borderColor: primary }
                    : { color: "#475569", boxShadow: "inset 0 0 0 1px #e2e8f0" }
                }
              >
                {t}
              </button>
            ))}
          </div>

          <button
            className="mt-4 w-full rounded-md py-2 text-sm font-medium text-white"
            style={{ backgroundColor: primary }}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
