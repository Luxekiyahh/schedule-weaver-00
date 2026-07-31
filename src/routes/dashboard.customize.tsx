import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { ExternalLink, Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { normalizeTheme } from "@/lib/theme";
import { updateBookingDesign } from "@/lib/tenant.functions";
import { uploadOnboardingImage } from "@/lib/onboarding.functions";
import { readFileAsDataUrl } from "@/components/onboarding/wizard-config";

export const Route = createFileRoute("/dashboard/customize")({
  component: CustomizePage,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/onboarding" });
  },
  head: () => ({ meta: [{ title: "Booking page design — Dashboard" }] }),
});

type Ctx = { workspaceId: string; slug: string; name: string };

function CustomizePage() {
  const uploadImage = useServerFn(uploadOnboardingImage);
  const saveDesign = useServerFn(updateBookingDesign);

  const [ctx, setCtx] = useState<Ctx | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [primaryColor, setPrimaryColor] = useState("#0f172a");
  const [pageColor, setPageColor] = useState("#ffffff");
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
  const [slotBgUrl, setSlotBgUrl] = useState<string | null>(null);
  const [backgroundPreview, setBackgroundPreview] = useState<string | null>(null);
  const [slotBgPreview, setSlotBgPreview] = useState<string | null>(null);
  const [bgUploading, setBgUploading] = useState(false);
  const [slotBgUploading, setSlotBgUploading] = useState(false);
  const bgRef = useRef<HTMLInputElement | null>(null);
  const slotBgRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data: m } = await supabase
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", u.user.id)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();
      if (!m) { setLoading(false); return; }
      const { data: ws } = await supabase
        .from("workspaces")
        .select("id, slug, name, theme_config")
        .eq("id", m.workspace_id)
        .single();
      if (ws) {
        setCtx({ workspaceId: ws.id, slug: ws.slug, name: ws.name });
        const theme = normalizeTheme(ws.theme_config);
        setPrimaryColor(theme.primary_color);
        setPageColor(theme.background_color);
        setBackgroundUrl(theme.background_image_url ?? null);
        setSlotBgUrl(theme.slot_background_image_url ?? null);
      }
      setLoading(false);
    })();
  }, []);

  async function handleUpload(file: File, kind: "background" | "slot-background") {
    if (!ctx) return;
    const setUploading = kind === "background" ? setBgUploading : setSlotBgUploading;
    setUploading(true);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const { url } = await uploadImage({ data: { workspaceId: ctx.workspaceId, dataUrl, kind } });
      if (kind === "background") {
        setBackgroundUrl(url);
        setBackgroundPreview(dataUrl);
      } else {
        setSlotBgUrl(url);
        setSlotBgPreview(dataUrl);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Image upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    if (!ctx) return;
    setSaving(true);
    try {
      await saveDesign({ data: { workspaceId: ctx.workspaceId, backgroundUrl, slotBackgroundUrl: slotBgUrl } });
      toast.success("Booking page design saved.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save design");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!ctx) {
    return <p className="p-8 text-sm text-muted-foreground">No workspace found.</p>;
  }

  const bgShown = backgroundPreview ?? backgroundUrl;
  const slotBgShown = slotBgPreview ?? slotBgUrl;

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Booking page design</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Background images for <span className="font-medium text-foreground">{ctx.name}</span>'s booking site.
            Images always fill the screen edge-to-edge — never stretched or tiled.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/booking/$slug" params={{ slug: ctx.slug }} target="_blank">
              <ExternalLink className="mr-2 h-4 w-4" /> Preview booking page
            </Link>
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save design
          </Button>
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        {/* Uploaders */}
        <div className="space-y-6">
          <input
            ref={bgRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleUpload(f, "background");
              e.target.value = "";
            }}
          />
          <input
            ref={slotBgRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleUpload(f, "slot-background");
              e.target.value = "";
            }}
          />

          <section className="rounded-xl border border-border p-4">
            <p className="text-sm font-semibold">Main site background</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Covers the whole booking page behind your content. A subtle tint keeps text readable.
            </p>
            <div className="group relative mt-3 aspect-video overflow-hidden rounded-xl border border-dashed border-border bg-muted/30">
              {bgUploading ? (
                <div className="flex h-full items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : bgShown ? (
                <>
                  <img src={bgShown} alt="Site background" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => { setBackgroundUrl(null); setBackgroundPreview(null); }}
                    className="absolute right-1.5 top-1.5 rounded-full bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => bgRef.current?.click()}
                  className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-muted-foreground hover:border-primary/60"
                >
                  <Upload className="h-5 w-5" />
                  <span className="text-[11px]">Upload image</span>
                </button>
              )}
            </div>
          </section>

          <section className="rounded-xl border border-border p-4">
            <p className="text-sm font-semibold">Time-slots background</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Appears behind the available-times panel on your booking page.
            </p>
            <div className="group relative mt-3 aspect-video overflow-hidden rounded-xl border border-dashed border-border bg-muted/30">
              {slotBgUploading ? (
                <div className="flex h-full items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : slotBgShown ? (
                <>
                  <img src={slotBgShown} alt="Time-slots background" className="absolute inset-0 h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-black/45" />
                  <div className="absolute inset-0 grid grid-cols-4 content-center gap-1.5 p-3">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <span key={i} className="rounded-full bg-white/90 px-1 py-1 text-center text-[9px] font-medium text-slate-700">
                        {9 + Math.floor(i / 2)}:{i % 2 ? "30" : "00"}
                      </span>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => { setSlotBgUrl(null); setSlotBgPreview(null); }}
                    className="absolute right-1.5 top-1.5 z-10 rounded-full bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => slotBgRef.current?.click()}
                  className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-muted-foreground hover:border-primary/60"
                >
                  <Upload className="h-5 w-5" />
                  <span className="text-[11px]">Upload image</span>
                </button>
              )}
            </div>
          </section>
        </div>

        {/* Live mock */}
        <div className="lg:sticky lg:top-8">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Live preview</p>
          <div className="overflow-hidden rounded-2xl border border-border shadow-sm">
            <div className="relative h-[420px]" style={{ backgroundColor: pageColor }}>
              {bgShown && (
                <>
                  <div
                    className="absolute inset-0"
                    style={{ backgroundImage: `url(${bgShown})`, backgroundSize: "cover", backgroundPosition: "center" }}
                  />
                  <div className="absolute inset-0 bg-black/40" />
                </>
              )}
              <div className="relative flex h-full flex-col p-5">
                <p className="text-center text-sm font-bold" style={{ color: bgShown ? "#fff" : "#0f172a" }}>
                  {ctx.name}
                </p>
                <p className="mt-0.5 text-center text-[10px]" style={{ color: bgShown ? "rgba(255,255,255,0.7)" : "#64748b" }}>
                  Book online
                </p>
                <div className="mt-4 rounded-xl bg-white p-3 shadow-sm">
                  <p className="text-[11px] font-semibold text-slate-900">Pick a time</p>
                  <div
                    className="relative mt-2 overflow-hidden rounded-lg"
                    style={slotBgShown ? { backgroundImage: `url(${slotBgShown})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
                  >
                    {slotBgShown && <div className="absolute inset-0 bg-black/45" />}
                    <div className="relative grid grid-cols-3 gap-1.5 p-2">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <span key={i} className="rounded-md bg-white px-1 py-1.5 text-center text-[9px] font-medium text-slate-700 ring-1 ring-slate-200">
                          {9 + i}:00
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="mt-auto">
                  <div
                    className="rounded-full py-2 text-center text-[11px] font-semibold text-white"
                    style={{ backgroundColor: primaryColor }}
                  >
                    Continue
                  </div>
                </div>
              </div>
            </div>
          </div>
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            Remember to save before leaving this page.
          </p>
        </div>
      </div>
    </div>
  );
}
