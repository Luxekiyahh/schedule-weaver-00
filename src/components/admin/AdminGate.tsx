import { useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { isPlatformAdmin } from "@/lib/platform-admin.functions";
import { Loader2, ShieldAlert, LayoutDashboard, Users, Activity, Globe } from "lucide-react";
import { ForceDarkTheme } from "@/components/theme/ThemeProvider";

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
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
        <ShieldAlert className="h-10 w-10 text-amber-500" />
        <h1 className="mt-4 text-lg font-semibold text-foreground">Platform admin access required</h1>
        <p className="mt-1 text-sm text-muted-foreground">This area is only available to platform operators.</p>
      </div>
    );
  }

  return (
    <>
      <ForceDarkTheme />
      <div className="min-h-screen bg-background text-foreground">{children}</div>
    </>
  );
}


export function AdminNav() {
  const items = [
    { to: "/admin", label: "Overview", icon: LayoutDashboard },
    { to: "/admin/tenants", label: "Tenants", icon: Users },
    { to: "/admin/health", label: "System health", icon: Activity },
    { to: "/admin/domains", label: "Subdomains", icon: Globe },
  ] as const;
  return (
    <nav className="flex flex-wrap items-center gap-1 border-b border-border bg-card px-6 py-3">
      <span className="mr-3 text-sm font-semibold text-foreground">Procschedule Admin</span>
      {items.map((it) => (
        <Link
          key={it.to}
          to={it.to}
          activeOptions={{ exact: it.to === "/admin" }}
          activeProps={{ className: "bg-primary text-primary-foreground" }}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted"
        >
          <it.icon className="h-4 w-4" />
          {it.label}
        </Link>
      ))}
    </nav>
  );
}
