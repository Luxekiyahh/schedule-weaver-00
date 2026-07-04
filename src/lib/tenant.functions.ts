import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        businessName: z.string().trim().min(1).max(120),
        slug: slugSchema,
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const userId = context.userId;
    // 1. Make sure the chosen slug is free (excluding workspaces this user already owns)
    const { data: slugTaken } = await supabaseAdmin
      .from("workspaces")
      .select("id, owner_id")
      .eq("slug", data.slug)
      .maybeSingle();
    if (slugTaken && slugTaken.owner_id !== userId) {
      throw new Error("That URL is already taken. Try another.");
    }

    // 2. Find the workspace auto-created by the handle_new_user trigger.
    const { data: ws, error: wsErr } = await supabaseAdmin
      .from("workspaces")
      .select("id, slug")
      .eq("owner_id", userId)
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
      await seedDolliimarie(ws.id, userId);
    }

    return { workspaceId: ws.id, slug: data.slug };
  });

/** Confirm the caller is an active member of the workspace. */
async function assertMember(userId: string, workspaceId: string) {
  const { data } = await supabaseAdmin
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", userId)
    .eq("workspace_id", workspaceId)
    .eq("is_active", true)
    .maybeSingle();
  if (!data) throw new Error("You don't have access to this workspace.");
}

const businessInfoSchema = z.object({
  businessAddress: z.string().trim().max(300).optional().default(""),
  businessPhone: z.string().trim().max(60).optional().default(""),
  businessEmail: z.string().trim().max(160).optional().default(""),
  businessWebsite: z.string().trim().max(200).optional().default(""),
});

/** Read a workspace's business contact info for editing. */
export const getBusinessInfo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ workspaceId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertMember(context.userId, data.workspaceId);
    const { data: ws } = await supabaseAdmin
      .from("workspaces")
      .select("business_address, business_phone, business_email, business_website")
      .eq("id", data.workspaceId)
      .maybeSingle();
    return {
      businessAddress: ws?.business_address ?? "",
      businessPhone: ws?.business_phone ?? "",
      businessEmail: ws?.business_email ?? "",
      businessWebsite: ws?.business_website ?? "",
    };
  });

/** Save a workspace's business address + contact info (shown on emails). */
export const saveBusinessInfo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ workspaceId: z.string().uuid() }).merge(businessInfoSchema).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertMember(context.userId, data.workspaceId);
    const { error } = await supabaseAdmin
      .from("workspaces")
      .update({
        business_address: data.businessAddress || null,
        business_phone: data.businessPhone || null,
        business_email: data.businessEmail || null,
        business_website: data.businessWebsite || null,
      })
      .eq("id", data.workspaceId);
    if (error) throw new Error(error.message);
    return { ok: true };
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
      .select(
        "id, name, slug, timezone, owner_id, domain_status, theme_id, primary_color, secondary_color, font_family, logo_url",
      )
      .eq("slug", data.slug)
      .maybeSingle();
    if (!ws) return { workspace: null };

    const [branding, categories, variants, lengthOptions, hairColors] = await Promise.all([
      supabaseAdmin.from("workspace_branding").select("*").eq("workspace_id", ws.id).maybeSingle(),
      supabaseAdmin
        .from("service_categories")
        .select("id, name, description, sort_order, image_url")
        .eq("workspace_id", ws.id)
        .eq("active", true)
        .order("sort_order", { ascending: true }),
      supabaseAdmin
        .from("service_variants")
        .select("id, category_id, name, description, price_cents, duration_min, sort_order, image_url")
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

// ============================================================
// AI Setup Wizard
// ============================================================

const FONT_CHOICES = [
  "Playfair Display",
  "Inter",
  "Montserrat",
  "Cormorant Garamond",
  "DM Serif Display",
  "Space Grotesk",
  "Bebas Neue",
  "Lora",
  "Manrope",
  "Archivo Black",
] as const;

const brandingSchema = z.object({
  primary_color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  secondary_color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  background_color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  heading_font: z.string().min(1).max(60),
  body_font: z.string().min(1).max(60),
  hero_headline: z.string().min(2).max(120),
  hero_subheading: z.string().min(2).max(240),
  cta_label: z.string().min(2).max(40).optional().default("Book now"),
});

export type GeneratedBranding = z.infer<typeof brandingSchema>;

/**
 * Use Lovable AI to translate a free-form brand brief into a structured
 * workspace_branding payload. Returns JSON only; does not write to DB.
 */
export const generateBrandingFromPrompt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ prompt: z.string().trim().min(8).max(2000) }).parse(input),
  )
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI gateway not configured");

    const systemPrompt = `You are a senior brand designer for service businesses (salons, studios, spas, clinics).
Translate a one-line brief into a complete visual identity for a public booking storefront.

Rules:
- Colors must be readable: background should contrast with primary text; primary is used for CTAs and accents.
- Choose fonts from this allow-list (Google Fonts): ${FONT_CHOICES.join(", ")}.
- heading_font and body_font should pair tastefully (typically serif heading + sans body, or distinctive display + clean sans).
- hero_headline: 3-8 words, punchy, brand-forward (not generic).
- hero_subheading: 1 sentence, warm, specific to the brief.
- cta_label: 2-3 words ("Book now", "Reserve seat", "Start booking").

Palette hints (use as inspiration when keywords match the brief, but adapt freely):
- "pink" / "baby pink" / "soft luxury": background near #FFF0F5, accents like #FFB6C1 and #DB7093, elegant serif heading.
- "dark" / "moody" / "neon": near-black backgrounds (#121212, #1E1E1E) with a single saturated accent (neon green, electric blue, magenta) and bold sans heading.
- "earthy" / "wellness" / "spa" / "natural": warm creams (#FDFBF7), sage greens (#606C38), warm clay (#DDA15E), serene serif + clean sans pairing.
Return ONLY valid JSON matching the schema. No prose, no markdown.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: data.prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "emit_branding",
              description: "Emit a workspace_branding JSON payload",
              parameters: {
                type: "object",
                properties: {
                  primary_color: { type: "string", description: "Hex like #4F46E5" },
                  secondary_color: { type: "string", description: "Accent hex" },
                  background_color: { type: "string", description: "Page bg hex" },
                  heading_font: { type: "string", enum: [...FONT_CHOICES] },
                  body_font: { type: "string", enum: [...FONT_CHOICES] },
                  hero_headline: { type: "string" },
                  hero_subheading: { type: "string" },
                  cta_label: { type: "string" },
                },
                required: [
                  "primary_color",
                  "secondary_color",
                  "background_color",
                  "heading_font",
                  "body_font",
                  "hero_headline",
                  "hero_subheading",
                  "cta_label",
                ],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "emit_branding" } },
      }),
    });

    if (response.status === 429) throw new Error("AI is busy — please retry in a moment.");
    if (response.status === 402) throw new Error("AI credits exhausted. Add credits in Workspace Settings.");
    if (!response.ok) {
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      throw new Error("AI generation failed. Please try again.");
    }

    const payload = await response.json();
    const toolCall = payload?.choices?.[0]?.message?.tool_calls?.[0];
    const argsStr = toolCall?.function?.arguments;
    if (!argsStr) throw new Error("AI returned no result. Try a more specific prompt.");

    const parsed = brandingSchema.parse(JSON.parse(argsStr));
    return parsed;
  });

/**
 * Persist a generated branding payload to workspace_branding for the
 * authenticated user's owned workspace.
 */
export const publishBranding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        branding: brandingSchema,
      })
      .parse(input),
  )
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

    const { error: upErr } = await supabaseAdmin.from("workspace_branding").upsert(
      {
        workspace_id: ws.id,
        primary_hex: data.branding.primary_color,
        accent_hex: data.branding.secondary_color,
        background_hex: data.branding.background_color,
        heading_font: data.branding.heading_font,
        body_font: data.branding.body_font,
        hero_headline: data.branding.hero_headline,
        hero_subhead: data.branding.hero_subheading,
        cta_label: data.branding.cta_label ?? "Book now",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "workspace_id" },
    );
    if (upErr) throw new Error(upErr.message);

    return { ok: true, slug: ws.slug };
  });

/**
 * Read the authenticated user's AI credit balance for their owned workspace.
 */
export const getCreditBalance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({}).optional().parse(input))
  .handler(async ({ context }) => {
    const { data: ws } = await supabaseAdmin
      .from("workspaces")
      .select("id, ai_credits")
      .eq("owner_id", context.userId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (!ws) return { credits: 0 };
    return { credits: ws.ai_credits ?? 0 };
  });
