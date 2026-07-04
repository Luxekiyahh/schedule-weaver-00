import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Briefcase, Plus, Pencil, Trash2, Clock, DollarSign, Loader2, ChevronLeft, Link2,
  ImagePlus, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/services")({
  component: ServicesPage,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/onboarding" });
  },
  head: () => ({ meta: [{ title: "Services — Dashboard" }] }),
});

type Role = "owner" | "admin" | "staff" | "client";
type Service = {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price_cents: number;
  currency: string;
  is_active: boolean;
  image_url: string | null;
};


type Ctx = { workspaceId: string; memberId: string; role: Role };

function money(cents: number, ccy = "USD") {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: ccy }).format(cents / 100);
}

function ServicesPage() {
  const navigate = useNavigate();

  const [ctx, setCtx] = useState<Ctx | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [myLinks, setMyLinks] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Service | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data: mem } = await supabase
        .from("workspace_members")
        .select("id, role, workspace_id")
        .eq("user_id", u.user.id).eq("is_active", true).limit(1).maybeSingle();
      if (!mem) { setLoading(false); return; }
      setCtx({ workspaceId: mem.workspace_id, memberId: mem.id, role: mem.role as Role });
    })();
  }, []);

  const reload = async (c: Ctx) => {
    setLoading(true);
    const [{ data: svcs }, { data: links }] = await Promise.all([
      supabase.from("services").select("*").eq("workspace_id", c.workspaceId).order("created_at", { ascending: false }),
      supabase.from("service_providers").select("service_id").eq("workspace_id", c.workspaceId).eq("member_id", c.memberId),
    ]);
    setServices((svcs ?? []) as Service[]);
    setMyLinks(new Set((links ?? []).map((l: any) => l.service_id)));
    setLoading(false);
  };

  useEffect(() => { if (ctx) reload(ctx); }, [ctx]);

  const isAdmin = ctx?.role === "owner" || ctx?.role === "admin";

  const openNew = () => { setEditing(null); setOpen(true); };
  const openEdit = (s: Service) => { setEditing(s); setOpen(true); };

  const remove = async (s: Service) => {
    if (!confirm(`Delete "${s.name}"? This cannot be undone.`)) return;
    const { error } = await supabase.from("services").delete().eq("id", s.id);
    if (error) return toast.error(error.message);
    toast.success("Service deleted");
    if (ctx) reload(ctx);
  };

  const toggleLink = async (svc: Service, linked: boolean) => {
    if (!ctx) return;
    if (linked) {
      const { error } = await supabase.from("service_providers").insert({
        workspace_id: ctx.workspaceId, service_id: svc.id, member_id: ctx.memberId,
      });
      if (error) return toast.error(error.message);
      setMyLinks((prev) => new Set(prev).add(svc.id));
      toast.success(`Linked to ${svc.name}`);
    } else {
      const { error } = await supabase.from("service_providers").delete()
        .eq("workspace_id", ctx.workspaceId).eq("service_id", svc.id).eq("member_id", ctx.memberId);
      if (error) return toast.error(error.message);
      setMyLinks((prev) => { const n = new Set(prev); n.delete(svc.id); return n; });
      toast.success(`Unlinked from ${svc.name}`);
    }
  };

  if (!ctx) {
    return <div className="min-h-screen grid place-items-center bg-slate-50"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="mx-auto max-w-[1280px] px-6 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <button onClick={() => navigate({ to: "/dashboard/home" })} className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-900">
              <ChevronLeft className="h-3.5 w-3.5" /> Back to Dashboard
            </button>

            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Services</h1>
            <p className="mt-1 text-sm text-slate-500">
              {isAdmin ? "Manage your bookable offerings and pricing." : "Browse workspace services and choose which ones you offer."}
            </p>
          </div>
          {isAdmin && (
            <Button onClick={openNew} className="bg-slate-900 hover:bg-slate-800">
              <Plus className="h-4 w-4" /> New service
            </Button>
          )}
        </div>

        {loading ? (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-44 animate-pulse rounded-2xl border bg-white shadow-sm" />
            ))}
          </div>
        ) : services.length === 0 ? (
          <div className="mt-12 rounded-2xl border bg-white py-16 text-center shadow-sm">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-indigo-50">
              <Briefcase className="h-6 w-6 text-indigo-500" />
            </div>
            <p className="mt-4 text-sm font-medium text-slate-900">No services yet</p>
            <p className="mt-1 text-xs text-slate-500">
              {isAdmin ? "Create your first offering to start accepting bookings." : "Ask an admin to add services to this workspace."}
            </p>
            {isAdmin && (
              <Button onClick={openNew} className="mt-4 bg-slate-900 hover:bg-slate-800">
                <Plus className="h-4 w-4" /> New service
              </Button>
            )}
          </div>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((s) => {
              const linked = myLinks.has(s.id);
              return (
                <div key={s.id} className="group flex flex-col rounded-2xl border bg-white p-5 shadow-sm transition hover:shadow-md">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold text-slate-900">{s.name}</p>
                      {s.description && <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{s.description}</p>}
                    </div>
                    {!s.is_active && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-500">Inactive</span>
                    )}
                  </div>
                  <div className="mt-4 flex items-center gap-4 text-sm text-slate-600">
                    <span className="inline-flex items-center gap-1.5"><Clock className="h-4 w-4 text-slate-400" /> {s.duration_minutes} min</span>
                    <span className="inline-flex items-center gap-1.5"><DollarSign className="h-4 w-4 text-slate-400" /> {money(s.price_cents, s.currency)}</span>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t pt-3">
                    {isAdmin ? (
                      <>
                        <Button size="sm" variant="ghost" onClick={() => openEdit(s)}>
                          <Pencil className="h-3.5 w-3.5" /> Edit
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => remove(s)} className="text-rose-600 hover:text-rose-700">
                          <Trash2 className="h-3.5 w-3.5" /> Delete
                        </Button>
                      </>
                    ) : (
                      <label className="flex w-full cursor-pointer items-center justify-between text-xs font-medium text-slate-600">
                        <span className="inline-flex items-center gap-1.5">
                          <Link2 className="h-3.5 w-3.5" /> I offer this
                        </span>
                        <Switch checked={linked} onCheckedChange={(v) => toggleLink(s, v)} />
                      </label>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {isAdmin && (
        <ServiceDialog
          open={open}
          onOpenChange={setOpen}
          editing={editing}
          ctx={ctx}
          onSaved={() => { setOpen(false); reload(ctx); }}
        />
      )}
    </div>
  );
}

function ServiceDialog({
  open, onOpenChange, editing, ctx, onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: Service | null;
  ctx: Ctx;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState("30");
  const [price, setPrice] = useState("0.00");
  const [active, setActive] = useState(true);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(editing?.name ?? "");
      setDescription(editing?.description ?? "");
      setDuration(String(editing?.duration_minutes ?? 30));
      setPrice(editing ? (editing.price_cents / 100).toFixed(2) : "0.00");
      setActive(editing?.is_active ?? true);
      setImageUrl(editing?.image_url ?? null);
    }
  }, [open, editing]);

  const onPickImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Please choose an image file");
    if (file.size > 5 * 1024 * 1024) return toast.error("Image must be under 5MB");
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${ctx.workspaceId}/services/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("branding").upload(path, file, {
        cacheControl: "3600",
        upsert: true,
        contentType: file.type,
      });
      if (error) throw error;
      const { data } = supabase.storage.from("branding").getPublicUrl(path);
      setImageUrl(data.publicUrl);
      toast.success("Image uploaded");
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };


  const save = async () => {
    if (!name.trim()) return toast.error("Name is required");
    const mins = parseInt(duration, 10);
    const dollars = parseFloat(price);
    if (!Number.isFinite(mins) || mins <= 0) return toast.error("Duration must be a positive number");
    if (!Number.isFinite(dollars) || dollars < 0) return toast.error("Price must be 0 or more");
    const cents = Math.round(dollars * 100);

    setSaving(true);
    try {
      const trimmedName = name.trim();
      if (editing) {
        const { error } = await supabase.from("services").update({
          name: trimmedName,
          description: description.trim() || null,
          duration_minutes: mins,
          price_cents: cents,
          is_active: active,
          image_url: imageUrl,
        }).eq("id", editing.id);
        if (error) throw error;
        toast.success("Service updated");
      } else {
        const { data: inserted, error } = await supabase.from("services").insert({
          workspace_id: ctx.workspaceId,
          name: trimmedName,
          description: description.trim() || null,
          duration_minutes: mins,
          price_cents: cents,
          is_active: active,
          image_url: imageUrl,
        }).select("id").single();
        if (error) throw error;
        // Auto-link current admin as a provider for the new service
        const { error: linkErr } = await supabase.from("service_providers").insert({
          workspace_id: ctx.workspaceId,
          service_id: inserted.id,
          member_id: ctx.memberId,
        });
        if (linkErr && !/duplicate/i.test(linkErr.message)) {
          // Non-fatal — surface as warning
          toast.warning(`Service created, but link failed: ${linkErr.message}`);
        } else {
          toast.success("Service created");
        }
      }
      // Mirror the image onto the matching storefront catalog row (service_variants),
      // which is what the public booking page actually reads.
      await supabase.from("service_variants")
        .update({ image_url: imageUrl })
        .eq("workspace_id", ctx.workspaceId)
        .eq("name", trimmedName);

      onSaved();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit service" : "New service"}</DialogTitle>
          <DialogDescription>
            {editing ? "Update pricing and details for this offering." : "Add a new bookable offering to your catalog."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="svc-name">Service name</Label>
            <Input id="svc-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="60-min consultation" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="svc-desc">Description</Label>
            <Textarea id="svc-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="What's included…" />
          </div>
          <div className="space-y-2">
            <Label>Image</Label>
            <div className="flex items-center gap-3">
              {imageUrl ? (
                <div className="relative">
                  <img src={imageUrl} alt="" className="h-16 w-16 rounded-lg border object-cover" />
                  <button
                    type="button"
                    onClick={() => setImageUrl(null)}
                    className="absolute -right-2 -top-2 grid h-5 w-5 place-items-center rounded-full bg-slate-900 text-white shadow"
                    aria-label="Remove image"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <div className="grid h-16 w-16 place-items-center rounded-lg border border-dashed text-slate-400">
                  <ImagePlus className="h-5 w-5" />
                </div>
              )}
              <div>
                <input id="svc-image" type="file" accept="image/*" className="hidden" onChange={onPickImage} disabled={uploading} />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploading}
                  onClick={() => document.getElementById("svc-image")?.click()}
                >
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                  {imageUrl ? "Replace image" : "Add image"}
                </Button>
                <p className="mt-1 text-xs text-slate-500">Shown on your booking page. PNG or JPG, up to 5MB.</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="svc-dur">Duration (minutes)</Label>
              <Input id="svc-dur" type="number" min={1} step={5} value={duration} onChange={(e) => setDuration(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="svc-price">Price ($)</Label>
              <Input id="svc-price" type="number" min={0} step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
          </div>
          <label className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="text-sm font-medium text-slate-900">Active</p>
              <p className="text-xs text-slate-500">Inactive services can't be booked.</p>
            </div>
            <Switch checked={active} onCheckedChange={setActive} />
          </label>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={save} disabled={saving} className="bg-slate-900 hover:bg-slate-800">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {editing ? "Save changes" : "Create service"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
