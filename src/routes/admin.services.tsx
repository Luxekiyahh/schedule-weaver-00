import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Layers, Clock, Loader2, ArrowLeft, Sparkles, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin/services")({
  component: AdminServicesPanel,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/onboarding" });
  },
  head: () => ({ meta: [{ title: "Service Catalog — Admin" }] }),
});

type Category = { id: string; name: string; description: string | null; sort_order: number };
type Variant = {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  price_cents: number;
  duration_min: number;
};
type LengthOption = { id: string; name: string; duration_min: number; price_cents: number };

function money(cents: number) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(cents / 100);
}

function AdminServicesPanel() {
  const [loading, setLoading] = useState(true);
  const [slug, setSlug] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [lengths, setLengths] = useState<LengthOption[]>([]);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data: mem } = await supabase
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", u.user.id)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();
      if (!mem) {
        setLoading(false);
        return;
      }
      const wsId = mem.workspace_id;
      const [{ data: ws }, { data: cats }, { data: vars }, { data: lens }] = await Promise.all([
        supabase.from("workspaces").select("slug").eq("id", wsId).maybeSingle(),
        supabase.from("service_categories").select("id, name, description, sort_order").eq("workspace_id", wsId).order("sort_order"),
        supabase.from("service_variants").select("id, category_id, name, description, price_cents, duration_min").eq("workspace_id", wsId).order("sort_order"),
        supabase.from("service_length_options").select("id, name, duration_min, price_cents").eq("workspace_id", wsId).order("sort_order"),
      ]);
      setSlug(ws?.slug ?? null);
      setCategories((cats ?? []) as Category[]);
      setVariants((vars ?? []) as Variant[]);
      setLengths((lens ?? []) as LengthOption[]);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <Link to="/dashboard" className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Dashboard
          </Link>
          <h1 className="flex items-center gap-2 text-3xl font-bold">
            <Layers className="h-7 w-7 text-primary" /> Service Catalog
          </h1>
          <p className="mt-1 text-muted-foreground">Your live, bookable services.</p>
        </div>
        {slug ? (
          <Button asChild variant="outline">
            <Link to="/book/$slug" params={{ slug }}>View storefront</Link>
          </Button>
        ) : null}
      </div>

      {categories.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-12 text-center">
          <Sparkles className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-muted-foreground">No services yet. Run the setup wizard to seed a starter catalog.</p>
          <Button asChild className="mt-4">
            <Link to="/onboarding">Go to setup</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-8">
          {categories.map((cat) => {
            const items = variants.filter((v) => v.category_id === cat.id);
            return (
              <section key={cat.id} className="rounded-2xl border bg-card p-6">
                <h2 className="text-xl font-semibold">{cat.name}</h2>
                {cat.description ? <p className="mt-1 text-sm text-muted-foreground">{cat.description}</p> : null}
                <ul className="mt-4 divide-y">
                  {items.map((v) => (
                    <li key={v.id} className="flex items-center justify-between py-3">
                      <div>
                        <p className="font-medium">{v.name}</p>
                        {v.description ? <p className="text-sm text-muted-foreground">{v.description}</p> : null}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{v.duration_min}m</span>
                        <span className="font-semibold text-foreground">{money(v.price_cents)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}

          {lengths.length > 0 ? (
            <section className="rounded-2xl border bg-card p-6">
              <h2 className="flex items-center gap-2 text-lg font-semibold"><Tag className="h-4 w-4" /> Length & sizing</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {lengths.map((l) => (
                  <span key={l.id} className="rounded-full border bg-muted px-3 py-1.5 text-sm">
                    {l.name}{l.price_cents > 0 ? ` (+${money(l.price_cents)})` : ""}
                  </span>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      )}
    </div>
  );
}
