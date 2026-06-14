import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Platform-operator tools for managing tenant subdomain registration.
 *
 * Lovable issues a TLS certificate per connected hostname, so each tenant
 * subdomain (`<slug>.procschedule.com`) must be connected manually as a custom
 * domain before its HTTPS storefront works. These functions power the internal
 * "subdomains to register" checklist: list every workspace + its domain_status,
 * and flip a workspace to "active" once its subdomain has been connected.
 *
 * All functions verify the caller is a platform admin via is_platform_admin().
 */

export const isPlatformAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.rpc("is_platform_admin");
    return { isPlatformAdmin: data === true };
  });

export const listTenantDomains = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: ok, error: rpcErr } = await context.supabase.rpc("is_platform_admin");
    if (rpcErr) throw new Error("Authorization check failed.");
    if (ok !== true) throw new Error("Forbidden: platform admin access required.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("workspaces")
      .select("id, name, slug, domain_status, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    return { tenants: data ?? [] };
  });

export const setTenantDomainStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        domainStatus: z.enum(["pending", "active"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: ok, error: rpcErr } = await context.supabase.rpc("is_platform_admin");
    if (rpcErr) throw new Error("Authorization check failed.");
    if (ok !== true) throw new Error("Forbidden: platform admin access required.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("workspaces")
      .update({ domain_status: data.domainStatus })
      .eq("id", data.workspaceId);
    if (error) throw new Error(error.message);

    return { ok: true };
  });
