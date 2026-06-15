import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import {
  isPlatformAdmin,
  listTenantDomains,
  setTenantDomainStatus,
} from "@/lib/platform-admin.functions";
import { TENANT_ROOT_DOMAIN } from "@/lib/subdomain";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Globe,
  Loader2,
  Check,
  Copy,
  ShieldAlert,
  Clock,
  CheckCircle2,
} from "lucide-react";

export const Route = createFileRoute("/admin/domains")({
  component: AdminDomainsPanel,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login" });
  },
  head: () => ({ meta: [{ title: "Subdomains to register — Admin" }] }),
});

type Tenant = {
  id: string;
  name: string;
  slug: string;
  domain_status: string | null;
  created_at: string;
};

function AdminDomainsPanel() {
  const checkAdmin = useServerFn(isPlatformAdmin);
  const fetchTenants = useServerFn(listTenantDomains);
  const updateStatus = useServerFn(setTenantDomainStatus);

  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);

  async function load() {
    try {
      const admin = await checkAdmin();
      if (!admin.isPlatformAdmin) {
        setAllowed(false);
        setLoading(false);
        return;
      }
      setAllowed(true);
      const res = await fetchTenants();
      setTenants(res.tenants as Tenant[]);
    } catch {
      setAllowed(false);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function toggle(t: Tenant) {
    const next = t.domain_status === "active" ? "pending" : "active";
    setSavingId(t.id);
    try {
      await updateStatus({ data: { workspaceId: t.id, domainStatus: next } });
      setTenants((list) =>
        list.map((x) => (x.id === t.id ? { ...x, domain_status: next } : x)),
      );
      toast.success(
        next === "active"
          ? `${t.slug}.${TENANT_ROOT_DOMAIN} marked as connected`
          : `${t.slug} set back to pending`,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setSavingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
        <ShieldAlert className="h-10 w-10 text-amber-500" />
        <h1 className="mt-4 text-lg font-semibold text-slate-900">
          Platform admin access required
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          This page is only available to platform operators.
        </p>
      </div>
    );
  }

  const pending = tenants.filter((t) => t.domain_status !== "active");
  const active = tenants.filter((t) => t.domain_status === "active");

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <header className="mb-8">
        <div className="mb-1 inline-flex items-center gap-2 text-sm font-medium text-indigo-600">
          <Globe className="h-4 w-4" />
          Platform operations
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Subdomains to register
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-500">
          Each tenant subdomain needs to be connected as a custom domain so a TLS
          certificate is issued. Connect{" "}
          <span className="font-mono">{`<slug>.${TENANT_ROOT_DOMAIN}`}</span> in
          Project Settings → Domains, then mark it connected here.
        </p>
      </header>

      <Section
        title="Pending"
        icon={<Clock className="h-4 w-4 text-amber-500" />}
        count={pending.length}
      >
        {pending.length === 0 ? (
          <Empty text="Nothing waiting — every subdomain is connected." />
        ) : (
          pending.map((t) => (
            <TenantRow
              key={t.id}
              tenant={t}
              saving={savingId === t.id}
              onToggle={() => toggle(t)}
            />
          ))
        )}
      </Section>

      <Section
        title="Connected"
        icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />}
        count={active.length}
      >
        {active.length === 0 ? (
          <Empty text="No subdomains connected yet." />
        ) : (
          active.map((t) => (
            <TenantRow
              key={t.id}
              tenant={t}
              saving={savingId === t.id}
              onToggle={() => toggle(t)}
            />
          ))
        )}
      </Section>
    </div>
  );
}

function Section({
  title,
  icon,
  count,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
        {icon}
        {title}
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
          {count}
        </span>
      </h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-400">
      {text}
    </div>
  );
}

function TenantRow({
  tenant,
  saving,
  onToggle,
}: {
  tenant: Tenant;
  saving: boolean;
  onToggle: () => void;
}) {
  const host = `${tenant.slug}.${TENANT_ROOT_DOMAIN}`;
  const isActive = tenant.domain_status === "active";

  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="min-w-0">
        <div className="truncate text-sm font-medium text-slate-900">
          {tenant.name}
        </div>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard?.writeText(host);
            toast.success("Subdomain copied");
          }}
          className="mt-0.5 inline-flex items-center gap-1.5 font-mono text-xs text-slate-500 hover:text-slate-800"
        >
          {host}
          <Copy className="h-3 w-3" />
        </button>
      </div>
      <Button
        size="sm"
        variant={isActive ? "outline" : "default"}
        disabled={saving}
        onClick={onToggle}
        className={
          isActive ? "" : "bg-slate-900 text-white hover:bg-slate-800"
        }
      >
        {saving ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isActive ? (
          "Set pending"
        ) : (
          <>
            <Check className="h-4 w-4" />
            Mark connected
          </>
        )}
      </Button>
    </div>
  );
}
