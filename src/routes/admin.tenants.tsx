import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { listTenants } from "@/lib/platform-admin.functions";
import { AdminGate, AdminNav } from "@/components/admin/AdminGate";
import { Input } from "@/components/ui/input";
import { Loader2, ExternalLink } from "lucide-react";
import { TENANT_ROOT_DOMAIN } from "@/lib/subdomain";

export const Route = createFileRoute("/admin/tenants")({
  component: TenantsPage,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login" });
  },
  head: () => ({ meta: [{ title: "Tenants — Procschedule Admin" }] }),
});

type Tenant = {
  id: string;
  name: string;
  slug: string;
  status: string;
  plan_tier: string | null;
  created_at: string;
  owner_email: string | null;
};

const STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-700",
  trial: "bg-blue-100 text-blue-700",
  past_due: "bg-amber-100 text-amber-700",
  suspended: "bg-rose-100 text-rose-700",
  no_subscription: "bg-slate-100 text-slate-600",
};

function TenantsPage() {
  return (
    <AdminGate>
      <AdminNav />
      <TenantsBody />
    </AdminGate>
  );
}

function TenantsBody() {
  const fetchTenants = useServerFn(listTenants);
  const [loading, setLoading] = useState(true);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetchTenants();
        setTenants(res.tenants as Tenant[]);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return tenants;
    return tenants.filter(
      (t) =>
        t.name?.toLowerCase().includes(term) ||
        t.slug?.toLowerCase().includes(term) ||
        t.owner_email?.toLowerCase().includes(term),
    );
  }, [q, tenants]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Tenants <span className="text-slate-400">({filtered.length})</span>
        </h1>
        <Input
          placeholder="Search name, subdomain, or owner…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-xs bg-white"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Subdomain</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((t) => (
              <tr key={t.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link
                    to="/admin/tenants/$id"
                    params={{ id: t.id }}
                    className="font-medium text-slate-900 hover:text-indigo-600"
                  >
                    {t.name}
                  </Link>
                  {t.owner_email && (
                    <div className="text-xs text-slate-400">{t.owner_email}</div>
                  )}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-slate-500">
                  {t.slug}.{TENANT_ROOT_DOMAIN}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[t.status] ?? "bg-slate-100 text-slate-600"}`}
                  >
                    {t.status.replace("_", " ")}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600">{t.plan_tier ?? "—"}</td>
                <td className="px-4 py-3 text-slate-500">
                  {new Date(t.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-right">
                  <a
                    href={`https://${t.slug}.${TENANT_ROOT_DOMAIN}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-indigo-600"
                  >
                    Storefront <ExternalLink className="h-3 w-3" />
                  </a>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                  No tenants match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
