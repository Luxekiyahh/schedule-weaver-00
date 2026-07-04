import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const checkSlugAvailable = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        slug: z
          .string()
          .min(2)
          .max(48)
          .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/),
        excludeWorkspaceId: z.string().uuid().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    let q = supabaseAdmin
      .from("workspaces")
      .select("id", { count: "exact", head: true })
      .eq("slug", data.slug);
    if (data.excludeWorkspaceId) q = q.neq("id", data.excludeWorkspaceId);
    const { count, error } = await q;
    if (error) throw new Error(error.message);
    return { available: (count ?? 0) === 0 };
  });

/**
 * Resolve the caller's owned workspace for the onboarding wizard.
 */
export const getOnboardingContext = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: ws, error } = await supabaseAdmin
      .from("workspaces")
      .select("id, name, slug")
      .eq("owner_id", context.userId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!ws) throw new Error("No workspace found for this account.");
    return { workspaceId: ws.id, slug: ws.slug, name: ws.name };
  });

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

async function uniqueSlug(base: string, workspaceId: string): Promise<string> {
  let candidate = base || "workspace";
  let i = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data } = await supabaseAdmin
      .from("workspaces")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();
    if (!data || data.id === workspaceId) return candidate;
    i += 1;
    candidate = `${base}-${i}`.slice(0, 48);
  }
}

/**
 * Upload a single onboarding image (logo / portfolio photo) to the public
 * `branding` bucket and return its public URL. Caller must own the workspace.
 */
export const uploadOnboardingImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        kind: z.enum(["logo", "portfolio"]),
        fileName: z.string().min(1).max(200),
        contentType: z.string().min(1).max(120),
        dataBase64: z.string().min(1).max(12_000_000),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    // Verify the caller owns this workspace.
    const { data: ws } = await supabaseAdmin
      .from("workspaces")
      .select("id")
      .eq("id", data.workspaceId)
      .eq("owner_id", context.userId)
      .maybeSingle();
    if (!ws) throw new Error("You don't have access to this workspace.");


    const ext = (data.fileName.split(".").pop() ?? "png").toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
    const safeName = `${data.kind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const path = `${data.workspaceId}/${data.kind}/${safeName}`;

    const buffer = Buffer.from(data.dataBase64, "base64");
    const { error: upErr } = await supabaseAdmin.storage
      .from("branding")
      .upload(path, buffer, { contentType: data.contentType, upsert: true });
    if (upErr) throw new Error(upErr.message);

    const { data: pub } = supabaseAdmin.storage.from("branding").getPublicUrl(path);
    return { url: pub.publicUrl };
  });

const serviceSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(1000).optional().default(""),
  durationMinutes: z.number().int().min(1).max(1440),
  priceCents: z.number().int().min(0).max(100_000_000),
  options: z
    .array(z.object({ label: z.string().trim().max(120), price: z.number().min(0).max(1_000_000) }))
    .max(20)
    .default([]),
});

const completeSchema = z.object({
  industry: z.string().max(40),
  themeId: z.enum(["default", "luxury-blush", "industrial-dark"]).default("default"),
  businessName: z.string().trim().min(1).max(120),
  ownerTitle: z.string().trim().max(120).optional().default(""),
  bio: z.string().trim().max(200).optional().default(""),
  logoUrl: z.string().url().nullable().optional(),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  secondaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  portfolioUrls: z.array(z.string().url()).max(9).default([]),
  services: z.array(serviceSchema).max(50).default([]),
  hours: z
    .array(
      z.object({
        dow: z.number().int().min(0).max(6),
        open: z.boolean(),
        start: z.string().regex(/^\d{2}:\d{2}$/),
        end: z.string().regex(/^\d{2}:\d{2}$/),
      }),
    )
    .max(7)
    .default([]),
  location: z.object({
    type: z.enum(["studio", "mobile", "home"]),
    address: z.string().trim().max(300).optional().default(""),
  }),
  businessPhone: z.string().trim().max(60).optional().default(""),
  businessEmail: z.string().trim().max(160).optional().default(""),
  businessWebsite: z.string().trim().max(200).optional().default(""),
  policies: z.object({
    deposit: z.number().min(0).max(1_000_000),
    cancellation: z.string().max(40),
    grace: z.string().max(40),
    noGuests: z.boolean(),
    customNote: z.string().trim().max(2000).optional().default(""),
  }),
  intake: z
    .array(
      z.object({
        label: z.string().trim().min(1).max(300),
        type: z.enum(["short", "long", "yesno", "file"]),
      }),
    )
    .max(30)
    .default([]),
  rating: z.number().int().min(1).max(5).optional(),
});

/**
 * Persist all onboarding wizard state to the caller's owned workspace.
 */
export const completeOnboarding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => completeSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: ws, error: wsErr } = await supabaseAdmin
      .from("workspaces")
      .select("id, slug")
      .eq("owner_id", context.userId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (wsErr) throw new Error(wsErr.message);
    if (!ws) throw new Error("No workspace found for this account.");
    const workspaceId = ws.id;

    const slug = await uniqueSlug(slugify(data.businessName), workspaceId);

    // 1. Workspace fields
    const { error: updErr } = await supabaseAdmin
      .from("workspaces")
      .update({
        name: data.businessName,
        slug,
        theme_id: data.themeId,
        primary_color: data.primaryColor,
        secondary_color: data.secondaryColor,
        logo_url: data.logoUrl ?? null,
        business_address: data.location.address || null,
        business_phone: data.businessPhone || null,
        business_email: data.businessEmail || null,
        business_website: data.businessWebsite || null,
      })
      .eq("id", workspaceId);
    if (updErr) throw new Error(updErr.message);

    // 2. Branding + structured layout_config
    const layout_config = {
      industry: data.industry,
      owner_title: data.ownerTitle,
      portfolio_urls: data.portfolioUrls,
      location: data.location,
      policies: data.policies,
      intake_questions: data.intake,
    };
    const { error: brandErr } = await supabaseAdmin.from("workspace_branding").upsert(
      {
        workspace_id: workspaceId,
        hero_headline: data.businessName,
        hero_subhead: data.bio || "Reserve your spot in just a few clicks.",
        primary_hex: data.primaryColor,
        accent_hex: data.secondaryColor,
        logo_url: data.logoUrl ?? null,
        layout_config,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "workspace_id" },
    );
    if (brandErr) throw new Error(brandErr.message);

    // 3. Services (replace)
    await supabaseAdmin.from("services").delete().eq("workspace_id", workspaceId);
    let insertedServices: { id: string }[] = [];
    if (data.services.length) {
      const rows = data.services.map((s) => ({
        workspace_id: workspaceId,
        name: s.name,
        description: s.description || null,
        duration_minutes: s.durationMinutes,
        price_cents: s.priceCents,
        options: s.options,
      }));
      const { data: svcRows, error: svcErr } = await supabaseAdmin
        .from("services")
        .insert(rows)
        .select("id");
      if (svcErr) throw new Error(svcErr.message);
      insertedServices = svcRows ?? [];
    }

    // 3b. Mirror services into the public storefront catalog schema
    // (service_categories + service_variants), which is what the public
    // booking pages read. Without this, onboarded tenants show an empty
    // storefront ("This business hasn't published any services yet.").
    await supabaseAdmin.from("service_variants").delete().eq("workspace_id", workspaceId);
    await supabaseAdmin.from("service_categories").delete().eq("workspace_id", workspaceId);
    if (data.services.length) {
      const categoryName = data.industry ? `${data.industry} Services` : "Services";
      const { data: cat, error: catErr } = await supabaseAdmin
        .from("service_categories")
        .insert({ workspace_id: workspaceId, name: categoryName, sort_order: 0, active: true })
        .select("id")
        .single();
      if (catErr) throw new Error(catErr.message);

      const variantRows = data.services.map((s, i) => ({
        workspace_id: workspaceId,
        category_id: cat.id,
        name: s.name,
        description: s.description || null,
        price_cents: s.priceCents,
        duration_min: s.durationMinutes,
        sort_order: i,
        active: true,
      }));
      const { error: varErr } = await supabaseAdmin.from("service_variants").insert(variantRows);
      if (varErr) throw new Error(varErr.message);

      // Link the flat services to this category so the booking flow can group
      // them into a collapsible category dropdown.
      await supabaseAdmin
        .from("services")
        .update({ category_id: cat.id })
        .eq("workspace_id", workspaceId);
    }


    // 4. Availability (replace owner member rows)
    const { data: member } = await supabaseAdmin
      .from("workspace_members")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (member) {
      // Make the owner a provider for every service (replace existing links).
      await supabaseAdmin
        .from("service_providers")
        .delete()
        .eq("workspace_id", workspaceId)
        .eq("member_id", member.id);
      if (insertedServices.length) {
        const { error: spErr } = await supabaseAdmin.from("service_providers").insert(
          insertedServices.map((s) => ({
            workspace_id: workspaceId,
            member_id: member.id,
            service_id: s.id,
          })),
        );
        if (spErr) throw new Error(spErr.message);
      }

      await supabaseAdmin
        .from("provider_availability")
        .delete()
        .eq("workspace_id", workspaceId)
        .eq("member_id", member.id);
      const openDays = data.hours.filter((h) => h.open && h.end > h.start);
      if (openDays.length) {
        const { error: avErr } = await supabaseAdmin.from("provider_availability").insert(
          openDays.map((h) => ({
            workspace_id: workspaceId,
            member_id: member.id,
            day_of_week: h.dow,
            start_time: h.start,
            end_time: h.end,
          })),
        );
        if (avErr) throw new Error(avErr.message);
      }
    }

    return { ok: true, slug };
  });
