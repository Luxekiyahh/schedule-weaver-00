import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, Sparkles } from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/onboarding" });
  },
  head: () => ({ meta: [{ title: "Dashboard" }] }),
});

function Dashboard() {
  const [workspace, setWorkspace] = useState<{ name: string; slug: string } | null>(
    null,
  );

  useEffect(() => {
    (async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;
      const { data } = await supabase
        .from("workspaces")
        .select("name, slug")
        .eq("owner_id", user.user.id)
        .limit(1)
        .maybeSingle();
      if (data) setWorkspace(data);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-6 py-12">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium text-indigo-600">
            <Sparkles className="h-4 w-4" /> Workspace ready
          </div>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = "/";
            }}
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          {workspace?.name ?? "Your dashboard"}
        </h1>
        {workspace && (
          <p className="mt-1 text-sm text-slate-500">
            Booking URL: <span className="font-mono">/book/{workspace.slug}</span>
          </p>
        )}
        <div className="mt-10 rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="text-sm text-slate-500">
            Your scheduling dashboard goes here. Calendar, services, and team
            management coming next.
          </p>
          <Link
            to="/onboarding"
            className="mt-4 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-800"
          >
            ← Back to onboarding
          </Link>
        </div>
      </div>
    </div>
  );
}
