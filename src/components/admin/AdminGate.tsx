import { useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { isPlatformAdmin } from "@/lib/platform-admin.functions";
import { Loader2, ShieldAlert, LayoutDashboard, Users, Activity, Globe } from "lucide-react";

export function AdminGate({ children }: { children: ReactNode }) {
  const checkAdmin = useServerFn(isPlatformAdmin);
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await checkAdmin();
        setAllowed(res.isPlatformAdmin);
      } catch {
        setAllowed(false);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        <h1 className="mt-4 text-lg font-semibold text-slate-900">Platform admin access required</h1>
        <p className="mt-1 text-sm text-slate-500">This area is only available to platform operators.</p>
      </div>
    );
  }

  return <div className="min-h-screen bg-slate-50">{children}</div>;
}

export function AdminNav() {
  const items = [
    { to: "/admin", label: "Overview", icon: LayoutDashboard },
    { to: "/admin/tenants", label: "Tenants", icon: Users },
    { to: "/admin/health", label: "System health", icon: Activity },
    { to: "/admin/domains", label: "Subdomains", icon: Globe },
  ] as const;
  return (
    <nav className="flex flex-wrap items-center gap-1 border-b border-slate-200 bg-white px-6 py-3">
      <span className="mr-3 text-sm font-semibold text-slate-900">Procschedule Admin</span>
      {items.map((it) => (
        <Link
          key={it.to}
          to={it.to}
          activeOptions={{ exact: it.to === "/admin" }}
          activeProps={{ className: "bg-slate-900 text-white" }}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
        >
          <it.icon className="h-4 w-4" />
          {it.label}
        </Link>
      ))}
    </nav>
  );
}
