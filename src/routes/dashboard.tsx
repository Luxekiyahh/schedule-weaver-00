import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

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

function DashboardLayout() {
  return <Outlet />;
}
