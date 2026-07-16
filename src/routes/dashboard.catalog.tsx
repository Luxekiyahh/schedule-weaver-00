import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import {
  ChevronLeft, Loader2, Plus, Pencil, Trash2, ArrowUp, ArrowDown,
  Layers, Users, Store, ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  getCatalogAdmin, saveCategory, deleteCategory, reorderCategories,
  setVariantCategory, setServiceCategory, setServiceProviders,
} from "@/lib/catalog-admin.functions";

export const Route = createFileRoute("/dashboard/catalog")({
  component: CatalogAdminPage,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login" });
  },
  head: () => ({ meta: [{ title: "Categories & Providers — Dashboard" }] }),
});

type Category = { id: string; name: string; description: string | null; sort_order: number; active: boolean };
type Variant = { id: string; category_id: string | null; name: string; price_cents: number; duration_min: number; active: boolean; sort_order: number };
type Service = { id: string; name: string; category_id: string | null; price_cents: number; duration_minutes: number; is_active: boolean };
type Provider = { member_id: string; name: string };
type Link_ = { service_id: string; member_id: string };
type Data = {
  workspace: { id: string; name: string; slug: string } | null;
  role: string;
  categories: Category[];
  variants: Variant[];
  services: Service[];
  providers: Provider[];
  links: Link_[];
};

function money(cents: number) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(cents / 100);
}

const UNCATEGORIZED = "—";

function CatalogAdminPage() {
  const load = useServerFn(getCatalogAdmin);
  const saveCat = useServerFn(saveCategory);
  const delCat = useServerFn(deleteCategory);
  const reorder = useServerFn(reorderCategories);
  const moveVariant = useServerFn(setVariantCategory);
  const moveService = useServerFn(setServiceCategory);
  const saveProviders = useServerFn(setServiceProviders);

  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [editing, setEditing] = useState<Category | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", active: true });

  const refresh = useCallback(async () => {
    try {
      const res = (await load()) as Data;
      setData(res);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load catalog");
    } finally {
      setLoading(false);
    }
  }, [load]);

  useEffect(() => { refresh(); }, [refresh]);

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", description: "", active: true });
    setDialogOpen(true);
  };
  const openEdit = (c: Category) => {
    setEditing(c);
    setForm({ name: c.name, description: c.description ?? "", active: c.active });
    setDialogOpen(true);
  };

  const submitCategory = async () => {
    if (!form.name.trim()) return toast.error("Give the category a name");
    setBusy(true);
    try {
      await saveCat({ data: { id: editing?.id, name: form.name.trim(), description: form.description.trim() || null, active: form.active } });
      toast.success(editing ? "Category updated" : "Category added");
      setDialogOpen(false);
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save category");
    } finally {
      setBusy(false);
    }
  };

  const removeCategory = async (c: Category) => {
    if (!confirm(`Delete category "${c.name}"?`)) return;
    setBusy(true);
    try {
      await delCat({ data: { id: c.id } });
      toast.success("Category deleted");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete category");
    } finally {
      setBusy(false);
    }
  };

  const move = async (index: number, dir: -1 | 1) => {
    if (!data) return;
    const cats = [...data.categories];
    const target = index + dir;
    if (target < 0 || target >= cats.length) return;
    [cats[index], cats[target]] = [cats[target], cats[index]];
    setData({ ...data, categories: cats }); // optimistic
    setBusy(true);
    try {
      await reorder({ data: { orderedIds: cats.map((c) => c.id) } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not reorder");
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const changeVariantCategory = async (variantId: string, categoryId: string) => {
    setBusy(true);
    try {
      await moveVariant({ data: { variantId, categoryId } });
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not move menu item");
    } finally {
      setBusy(false);
    }
  };

  const changeServiceCategory = async (serviceId: string, categoryId: string) => {
    setBusy(true);
    try {
      await moveService({ data: { serviceId, categoryId } });
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not move service");
    } finally {
      setBusy(false);
    }
  };

  const toggleProvider = async (service: Service, memberId: string, checked: boolean) => {
    if (!data) return;
    const current = new Set(data.links.filter((l) => l.service_id === service.id).map((l) => l.member_id));
    if (checked) current.add(memberId); else current.delete(memberId);
    setBusy(true);
    try {
      await saveProviders({ data: { serviceId: service.id, memberIds: [...current] } });
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update providers");
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen grid place-items-center bg-background"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }
  if (!data || !data.workspace) {
    return <div className="min-h-screen grid place-items-center bg-background text-muted-foreground">No workspace found.</div>;
  }

  const catName = (id: string | null) => data.categories.find((c) => c.id === id)?.name ?? UNCATEGORIZED;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="mx-auto max-w-[1100px] px-6 py-10">
        <Link to="/dashboard/home" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" /> Back to dashboard
        </Link>

        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Categories & Providers</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Organize your menu and choose who provides each service. Changes stay in sync with your storefront and booking page.
            </p>
          </div>
          <a
            href={`/${data.workspace.slug}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <Store className="h-4 w-4" /> View storefront <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>

        {/* Categories */}
        <section className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <Layers className="h-5 w-5 text-muted-foreground" /> Categories
            </h2>
            <Button size="sm" onClick={openNew} disabled={busy}>
              <Plus className="mr-1.5 h-4 w-4" /> Add category
            </Button>
          </div>

          <div className="mt-4 divide-y divide-slate-100">
            {data.categories.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">No categories yet.</p>
            )}
            {data.categories.map((c, i) => (
              <div key={c.id} className="flex items-center gap-3 py-3">
                <div className="flex flex-col">
                  <button className="text-muted-foreground hover:text-foreground disabled:opacity-30" disabled={busy || i === 0} onClick={() => move(i, -1)}>
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button className="text-muted-foreground hover:text-foreground disabled:opacity-30" disabled={busy || i === data.categories.length - 1} onClick={() => move(i, 1)}>
                    <ArrowDown className="h-4 w-4" />
                  </button>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">{c.name}</span>
                    {!c.active && <Badge variant="secondary" className="text-xs">Hidden</Badge>}
                  </div>
                  {c.description && <p className="truncate text-sm text-muted-foreground">{c.description}</p>}
                </div>
                <Button variant="ghost" size="icon" onClick={() => openEdit(c)} disabled={busy}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => removeCategory(c)} disabled={busy}>
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            ))}
          </div>
        </section>

        {/* Storefront menu items */}
        <section className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <Store className="h-5 w-5 text-muted-foreground" /> Storefront menu items
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">These appear on your public page. Assign each to a category.</p>
          <div className="mt-4 divide-y divide-slate-100">
            {data.variants.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No menu items.</p>}
            {data.variants.map((v) => (
              <div key={v.id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <span className="font-medium text-foreground">{v.name}</span>
                  <span className="ml-2 text-sm text-muted-foreground">{money(v.price_cents)} · {v.duration_min}m</span>
                </div>
                <Select value={v.category_id ?? undefined} onValueChange={(val) => changeVariantCategory(v.id, val)} disabled={busy}>
                  <SelectTrigger className="w-52"><SelectValue placeholder="Choose category" /></SelectTrigger>
                  <SelectContent>
                    {data.categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </section>

        {/* Bookable services + providers */}
        <section className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <Users className="h-5 w-5 text-muted-foreground" /> Bookable services & providers
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose the category and which providers offer each service. A service is only bookable when at least one provider is assigned.
          </p>
          <div className="mt-4 space-y-3">
            {data.services.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No services.</p>}
            {data.services.map((s) => {
              const assigned = new Set(data.links.filter((l) => l.service_id === s.id).map((l) => l.member_id));
              return (
                <div key={s.id} className="rounded-xl border border-border bg-background/50 p-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{s.name}</span>
                        {!s.is_active && <Badge variant="secondary" className="text-xs">Inactive</Badge>}
                        {assigned.size === 0 && s.is_active && <Badge variant="destructive" className="text-xs">No provider</Badge>}
                      </div>
                      <span className="text-sm text-muted-foreground">{money(s.price_cents)} · {s.duration_minutes}m · {catName(s.category_id)}</span>
                    </div>
                    <Select value={s.category_id ?? undefined} onValueChange={(val) => changeServiceCategory(s.id, val)} disabled={busy}>
                      <SelectTrigger className="w-52"><SelectValue placeholder="Choose category" /></SelectTrigger>
                      <SelectContent>
                        {data.categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-4 border-t border-border pt-3">
                    {data.providers.length === 0 && <span className="text-sm text-muted-foreground">No team members yet.</span>}
                    {data.providers.map((p) => (
                      <label key={p.member_id} className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
                        <Checkbox
                          checked={assigned.has(p.member_id)}
                          disabled={busy}
                          onCheckedChange={(v) => toggleProvider(s, p.member_id, v === true)}
                        />
                        {p.name}
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Category editor */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit category" : "Add category"}</DialogTitle>
            <DialogDescription>Categories group your menu items and services on both the storefront and booking page.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="cat-name">Name</Label>
              <Input id="cat-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Braids" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cat-desc">Description</Label>
              <Textarea id="cat-desc" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Short description shown under the category" rows={2} />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
              <div>
                <p className="text-sm font-medium text-foreground">Visible on storefront</p>
                <p className="text-xs text-muted-foreground">Hidden categories stay saved but don't show publicly.</p>
              </div>
              <Switch checked={form.active} onCheckedChange={(v) => setForm((f) => ({ ...f, active: v }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)} disabled={busy}>Cancel</Button>
            <Button onClick={submitCategory} disabled={busy}>
              {busy && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              {editing ? "Save" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
