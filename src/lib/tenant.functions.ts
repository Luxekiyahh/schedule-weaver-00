import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const slugSchema = z
  .string()
  .min(2)
  .max(48)
  .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/, "Lowercase letters, numbers, hyphens");

/**
 * Finalize a freshly-signed-up tenant: rename their auto-created workspace,
 * insert default branding, and (for the Dolliimarie slug) seed the starter catalog.
 */
export const finalizeTenantSignup = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        userId: z.string().uuid(),
        businessName: z.string().trim().min(1).max(120),
        slug: slugSchema,
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    // 1. Make sure the chosen slug is free (excluding workspaces this user already owns)
    const { data: slugTaken } = await supabaseAdmin
      .from("workspaces")
      .select("id, owner_id")
      .eq("slug", data.slug)
      .maybeSingle();
    if (slugTaken && slugTaken.owner_id !== data.userId) {
      throw new Error("That URL is already taken. Try another.");
    }

    // 2. Find the workspace auto-created by the handle_new_user trigger.
    const { data: ws, error: wsErr } = await supabaseAdmin
      .from("workspaces")
      .select("id, slug")
      .eq("owner_id", data.userId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (wsErr) throw new Error(wsErr.message);
    if (!ws) throw new Error("Workspace not initialized. Please sign in again.");

    // 3. Rename + reslug it (and set NY timezone for Dolliimarie).
    const isDolliimarie = data.slug === "dolliimarie";
    const { error: updErr } = await supabaseAdmin
      .from("workspaces")
      .update({
        name: data.businessName,
        slug: data.slug,
        timezone: isDolliimarie ? "America/New_York" : "UTC",
      })
      .eq("id", ws.id);
    if (updErr) throw new Error(updErr.message);

    // 4. Insert default branding (idempotent).
    const defaultBranding = isDolliimarie
      ? {
          primary_hex: "#1a1a1a",
          accent_hex: "#d4a574",
          background_hex: "#faf7f2",
          heading_font: "Playfair Display",
          body_font: "Inter",
          hero_headline: "Dolliimarie Hair Studio",
          hero_subhead: "Luxury hair extensions, installs, and maintenance by Melanie.",
          cta_label: "Book your appointment",
        }
      : {
          hero_headline: data.businessName,
          hero_subhead: "Reserve your spot in just a few clicks.",
        };
    await supabaseAdmin
      .from("workspace_branding")
      .upsert({ workspace_id: ws.id, ...defaultBranding }, { onConflict: "workspace_id" });

    // 5. Seed Dolliimarie starter catalog + availability (once).
    if (isDolliimarie) {
      await seedDolliimarie(ws.id, data.userId);
    }

    return { workspaceId: ws.id, slug: data.slug };
  });

async function seedDolliimarie(workspaceId: string, userId: string) {
  // Skip if already seeded.
  const { count } = await supabaseAdmin
    .from("service_categories")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId);
  if ((count ?? 0) > 0) return;

  // Categories
  const { data: cats, error: catErr } = await supabaseAdmin
    .from("service_categories")
    .insert([
      { workspace_id: workspaceId, name: "Hair Extension Installs", description: "Full installs: sew-ins, tape-ins, k-tips.", sort_order: 1 },
      { workspace_id: workspaceId, name: "Maintenance", description: "Move-ups, refreshes, and styling.", sort_order: 2 },
      { workspace_id: workspaceId, name: "Removal & Care", description: "Safe removal and scalp care.", sort_order: 3 },
    ])
    .select("id, name");
  if (catErr) throw new Error(catErr.message);
  const byName = new Map(cats!.map((c) => [c.name, c.id]));

  await supabaseAdmin.from("service_variants").insert([
    { workspace_id: workspaceId, category_id: byName.get("Hair Extension Installs")!, name: "Sew-In Install", price_cents: 25000, duration_min: 240, sort_order: 1 },
    { workspace_id: workspaceId, category_id: byName.get("Hair Extension Installs")!, name: "Tape-In Install", price_cents: 20000, duration_min: 180, sort_order: 2 },
    { workspace_id: workspaceId, category_id: byName.get("Hair Extension Installs")!, name: "K-Tip Install", price_cents: 35000, duration_min: 300, sort_order: 3 },
    { workspace_id: workspaceId, category_id: byName.get("Maintenance")!, name: "Sew-In Move Up", price_cents: 15000, duration_min: 150, sort_order: 1 },
    { workspace_id: workspaceId, category_id: byName.get("Maintenance")!, name: "Tape-In Refresh", price_cents: 12000, duration_min: 120, sort_order: 2 },
    { workspace_id: workspaceId, category_id: byName.get("Removal & Care")!, name: "Extension Removal", price_cents: 8000, duration_min: 90, sort_order: 1 },
  ]);

  await supabaseAdmin.from("service_length_options").insert([
    { workspace_id: workspaceId, name: '14"', duration_min: 0, price_cents: 0, sort_order: 1 },
    { workspace_id: workspaceId, name: '16"', duration_min: 0, price_cents: 2500, sort_order: 2 },
    { workspace_id: workspaceId, name: '18"', duration_min: 30, price_cents: 5000, sort_order: 3 },
    { workspace_id: workspaceId, name: '20"', duration_min: 30, price_cents: 7500, sort_order: 4 },
    { workspace_id: workspaceId, name: '22"', duration_min: 60, price_cents: 10000, sort_order: 5 },
    { workspace_id: workspaceId, name: '24"', duration_min: 60, price_cents: 15000, sort_order: 6 },
  ]);

  await supabaseAdmin.from("service_hair_colors").insert([
    { workspace_id: workspaceId, code: "1", label: "Jet Black", swatch_hex: "#0a0a0a", sort_order: 1 },
    { workspace_id: workspaceId, code: "1B", label: "Natural Black", swatch_hex: "#1a1a1a", sort_order: 2 },
    { workspace_id: workspaceId, code: "2", label: "Dark Brown", swatch_hex: "#3b2417", sort_order: 3 },
    { workspace_id: workspaceId, code: "4", label: "Medium Brown", swatch_hex: "#5c3a1e", sort_order: 4 },
    { workspace_id: workspaceId, code: "6", label: "Chestnut", swatch_hex: "#7a4e2d", sort_order: 5 },
    { workspace_id: workspaceId, code: "27", label: "Honey Blonde", swatch_hex: "#c9954f", sort_order: 6 },
    { workspace_id: workspaceId, code: "613", label: "Platinum Blonde", swatch_hex: "#e8d4a8", sort_order: 7 },
    { workspace_id: workspaceId, code: "99J", label: "Burgundy", swatch_hex: "#5e1a2b", sort_order: 8 },
  ]);

  // Seed weekly availability for the owner: Mon–Fri 9:30–19:00, Sat–Sun 9:30–20:00.
  const { data: member } = await supabaseAdmin
    .from("workspace_members")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .maybeSingle();
  if (member) {
    const avail = [
      { dow: 1, start: "09:30", end: "19:00" },
      { dow: 2, start: "09:30", end: "19:00" },
      { dow: 3, start: "09:30", end: "19:00" },
      { dow: 4, start: "09:30", end: "19:00" },
      { dow: 5, start: "09:30", end: "19:00" },
      { dow: 6, start: "09:30", end: "20:00" },
      { dow: 0, start: "09:30", end: "20:00" },
    ];
    await supabaseAdmin.from("provider_availability").insert(
      avail.map((a) => ({
        workspace_id: workspaceId,
        member_id: member.id,
        day_of_week: a.dow,
        start_time: a.start,
        end_time: a.end,
      })),
    );
  }
}

/**
 * Load everything needed to render a public storefront for a given slug.
 */
export const getStorefront = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ slug: slugSchema }).parse(input))
  .handler(async ({ data }) => {
    const { data: ws } = await supabaseAdmin
      .from("workspaces")
      .select("id, name, slug, timezone")
      .eq("slug", data.slug)
      .maybeSingle();
    if (!ws) return { workspace: null };

    const [branding, categories, variants, lengthOptions, hairColors] = await Promise.all([
      supabaseAdmin.from("workspace_branding").select("*").eq("workspace_id", ws.id).maybeSingle(),
      supabaseAdmin
        .from("service_categories")
        .select("id, name, description, sort_order")
        .eq("workspace_id", ws.id)
        .eq("active", true)
        .order("sort_order", { ascending: true }),
      supabaseAdmin
        .from("service_variants")
        .select("id, category_id, name, description, price_cents, duration_min, sort_order")
        .eq("workspace_id", ws.id)
        .eq("active", true)
        .order("sort_order", { ascending: true }),
      supabaseAdmin
        .from("service_length_options")
        .select("id, name, duration_min, price_cents, sort_order")
        .eq("workspace_id", ws.id)
        .eq("active", true)
        .order("sort_order", { ascending: true }),
      supabaseAdmin
        .from("service_hair_colors")
        .select("id, code, label, swatch_hex, sort_order")
        .eq("workspace_id", ws.id)
        .eq("active", true)
        .order("sort_order", { ascending: true }),
    ]);

    return {
      workspace: ws,
      branding: branding.data ?? null,
      categories: categories.data ?? [],
      variants: variants.data ?? [],
      lengthOptions: lengthOptions.data ?? [],
      hairColors: hairColors.data ?? [],
    };
  });
