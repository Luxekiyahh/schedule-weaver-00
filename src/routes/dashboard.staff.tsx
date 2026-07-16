import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, Loader2, UserCircle2, UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/staff")({
  component: StaffPage,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/onboarding" });
  },
  head: () => ({ meta: [{ title: "Team & Providers — Dashboard" }] }),
});

type Role = "owner" | "admin" | "staff" | "client";
type Member = {
  id: string;
  user_id: string;
  role: Role;
  profile?: { full_name: string | null; email: string | null; avatar_url: string | null } | null;
};

function StaffPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [workspaceName, setWorkspaceName] = useState("Workspace");
  const [members, setMembers] = useState<Member[]>([]);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data: mem } = await supabase
        .from("workspace_members")
        .select("workspace_id, workspaces(name)")
        .eq("user_id", u.user.id)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();
      if (!mem) { setLoading(false); return; }
      const ws = (mem as unknown as { workspaces?: { name?: string } | null }).workspaces;
      setWorkspaceName(ws?.name ?? "Workspace");

      const { data: mems } = await supabase
        .from("workspace_members")
        .select("id, user_id, role")
        .eq("workspace_id", mem.workspace_id)
        .eq("is_active", true)
        .in("role", ["owner", "admin", "staff"]);

      let memList: Member[] = [];
      if (mems && mems.length) {
        const userIds = mems.map((m) => m.user_id);
        const { data: profs } = await supabase
          .from("profiles").select("id, full_name, email, avatar_url").in("id", userIds);
        const pmap = new Map((profs ?? []).map((p) => [p.id, p]));
        memList = mems.map((m) => ({
          id: m.id, user_id: m.user_id, role: m.role as Role,
          profile: pmap.get(m.user_id) ?? null,
        }));
      }
      setMembers(memList);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-[1000px] px-6 py-6">
        <button
          onClick={() => navigate({ to: "/dashboard/home" })}
          className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" /> Back to Dashboard
        </button>

        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">{workspaceName}</p>
              <h1 className="text-lg font-semibold text-foreground">Team &amp; Providers</h1>
            </div>
          </div>
          <Button
            className="bg-primary hover:bg-primary"
            onClick={() => toast.info("Invites coming soon")}
          >
            <UserPlus className="h-4 w-4" /> Invite provider
          </Button>
        </div>

        {loading ? (
          <div className="grid place-items-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : members.length === 0 ? (
          <div className="rounded-2xl border bg-card p-10 text-center text-muted-foreground shadow-sm">
            No team members yet.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {members.map((m) => (
              <div key={m.id} className="flex items-center gap-3 rounded-2xl border bg-card p-5 shadow-sm">
                <UserCircle2 className="h-10 w-10 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {m.profile?.full_name ?? m.profile?.email ?? "Member"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{m.profile?.email ?? "—"}</p>
                </div>
                <span className="ml-auto rounded-full bg-muted px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  {m.role}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
