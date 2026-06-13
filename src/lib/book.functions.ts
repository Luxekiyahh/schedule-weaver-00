import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Public storefront catalog read for /book/$slug.
 * Uses the admin client (service role) because storefronts are public and
 * workspaces have no anon SELECT policy. Only safe, presentational columns
 * are projected.
 */
export const getBookCatalog = createServerFn({ method: "GET" })
  .inputValidator((input) =>
    z.object({ slug: z.string().trim().min(1).max(120) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: workspace, error: wsErr } = await supabaseAdmin
      .from("workspaces")
      .select("id, name, slug, primary_color, secondary_color, font_family, logo_url")
      .eq("slug", data.slug)
      .maybeSingle();
    if (wsErr) throw new Error(wsErr.message);
    if (!workspace) {
      return { workspace: null, categories: [], variants: [], lengthOptions: [] } as const;
    }

    const [cats, vars, lengths] = await Promise.all([
      supabaseAdmin
        .from("service_categories")
        .select("id, name, description, sort_order")
        .eq("workspace_id", workspace.id)
        .eq("active", true)
        .order("sort_order", { ascending: true }),
      supabaseAdmin
        .from("service_variants")
        .select("id, category_id, name, description, price_cents, duration_min, sort_order")
        .eq("workspace_id", workspace.id)
        .eq("active", true)
        .order("sort_order", { ascending: true }),
      supabaseAdmin
        .from("service_length_options")
        .select("id, name, duration_min, price_cents, sort_order")
        .eq("workspace_id", workspace.id)
        .eq("active", true)
        .order("sort_order", { ascending: true }),
    ]);

    return {
      workspace,
      categories: cats.data ?? [],
      variants: vars.data ?? [],
      lengthOptions: lengths.data ?? [],
    } as const;
  });
