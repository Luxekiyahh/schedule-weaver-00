import { createFileRoute, Outlet, redirect, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { useSubscription } from "@/hooks/useSubscription";
import { syncWorkspaceSubscription } from "@/utils/payments.functions";
import { isPlatformAdmin } from "@/lib/platform-admin.functions";
import { getStripeEnvironment } from "@/lib/stripe";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { ThemeProvider, ThemeToggle } from "@/components/theme/ThemeProvider";

export const Route = createFileRoute("/dashboard")({
  component: DashboardLayout,
  beforeLoad: async ({ location }) => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login" });
    if (location.pathname === "/dashboard" || location.pathname === "/dashboard/") {
      throw redirect({ to: "/dashboard/home" });
    }
  },
  head: () => ({ meta: [{ title: "Dashboard" }] }),
});

// Pages that must stay reachable even without an active subscription, so the
// tenant can (re)subscribe or manage billing.
const ALLOWED_WHEN_INACTIVE = ["/dashboard/billing"];

function DashboardLayout() {
  const sub = useSubscription();
  const navigate = useNavigate();
  const location = useLocation();
  const syncSub = useServerFn(syncWorkspaceSubscription);
  const [synced, setSynced] = useState(false);
  const syncStarted = useRef(false);

  // Reconcile from Stripe once before deciding whether to gate — avoids
  // bouncing a paying tenant whose webhook was missed or mis-tagged.
  useEffect(() => {
    if (!sub.workspaceId || syncStarted.current) return;
    syncStarted.current = true;
    syncSub({ data: { workspaceId: sub.workspaceId, environment: getStripeEnvironment() } })
      .catch(() => {})
      .finally(() => {
        sub.refresh();
        setSynced(true);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sub.workspaceId]);

  const allowed = ALLOWED_WHEN_INACTIVE.some((p) => location.pathname.startsWith(p));

  useEffect(() => {
    if (sub.loading || !synced) return;
    if (!sub.isActive && !allowed) {
      toast.error("Your subscription is inactive", {
        description: "Choose a plan to continue using your dashboard.",
      });
      navigate({ to: "/pricing" });
    }
  }, [sub.loading, synced, sub.isActive, allowed, navigate]);

  // While we resolve subscription state, avoid flashing protected content.
  if ((sub.loading || !synced) && !allowed) {
    return (
      <ThemeProvider>
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-background text-foreground">
        <div className="fixed bottom-5 right-5 z-50">
          <ThemeToggle />
        </div>
        <Outlet />
      </div>
    </ThemeProvider>
  );
}
