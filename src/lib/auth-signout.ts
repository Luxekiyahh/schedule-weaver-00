import { supabase } from "@/integrations/supabase/client";
import type { QueryClient } from "@tanstack/react-query";

/**
 * Sign the current user out and clear any client-side cached data.
 * Order matters: cancel in-flight queries first so their 401s don't surface
 * as toast errors, clear cache so a Back navigation can't restore a shell
 * hydrated from another user's data, then drop the session.
 */
export async function signOutAndReset(queryClient?: QueryClient) {
  try {
    await queryClient?.cancelQueries();
    queryClient?.clear();
  } catch {
    /* noop */
  }
  await supabase.auth.signOut();
}

/**
 * Role-aware landing path for a signed-in user. Mirrors the redirect logic
 * used after a successful password sign-in so "Continue to your dashboard"
 * on the identity gate lands in the same place.
 */
export async function resolveHomePathForUser(userId: string): Promise<string> {
  const { data: membership } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!membership) return "/onboarding";
  const role = membership.role as string;
  if (role === "client") return "/";
  return "/dashboard/home";
}
