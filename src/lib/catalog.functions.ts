import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type Industry = "barbershop" | "hair_braiding" | "nails";

export const INDUSTRIES: Array<{ id: Industry; label: string; description: string; emoji: string }> = [
  { id: "barbershop", label: "Barbershop", description: "Cuts, fades, beard trims & grooming", emoji: "💈" },
  { id: "hair_braiding", label: "Hair & Braiding", description: "Braids, twists, locs & protective styles", emoji: "💇🏾‍♀️" },
  { id: "nails", label: "Nail Salon", description: "Manicures, pedicures, gel & extensions", emoji: "💅" },
];

type SeedVariant = { name: string; description?: string; price_cents: number; duration_min: number };
type SeedCategory = { name: string; description: string; variants: SeedVariant[] };

const TEMPLATES: Record<Industry, { categories: SeedCategory[]; lengthOptions: { name: string; duration_min: number; price_cents: number }[] }> = {
  barbershop: {
    categories: [
      {
        name: "Haircuts",
        description: "Precision cuts and signature fades.",
        variants: [
          { name: "Adult Cut", description: "Classic scissor or clipper cut.", price_cents: 3500, duration_min: 45 },
          { name: "Skin Fade", description: "Bald fade blended to the skin.", price_cents: 4000, duration_min: 50 },
          { name: "Kids Cut", description: "Ages 12 and under.", price_cents: 2500, duration_min: 30 },
        ],
      },
      {
        name: "Beard & Grooming",
        description: "Beard sculpting and hot-towel finishes.",
        variants: [
          { name: "Beard Trim", description: "Line-up and shape.", price_cents: 2000, duration_min: 25 },
          { name: "Hot Towel Shave", description: "Traditional straight-razor shave.", price_cents: 3000, duration_min: 40 },
        ],
      },
    ],
    lengthOptions: [
      { name: "Short", duration_min: 30, price_cents: 0 },
      { name: "Standard", duration_min: 45, price_cents: 0 },
    ],
  },
  hair_braiding: {
    categories: [
      {
        name: "Braid Services",
        description: "Protective and statement braid styles.",
        variants: [
          { name: "Box Braids", description: "Classic knotless or standard box braids.", price_cents: 16000, duration_min: 240 },
          { name: "Cornrows", description: "Straight-back or design cornrows.", price_cents: 9000, duration_min: 150 },
          { name: "Knotless Braids", description: "Lightweight knotless install.", price_cents: 18000, duration_min: 300 },
        ],
      },
      {
        name: "Twists & Locs",
        description: "Twists, faux locs and maintenance.",
        variants: [
          { name: "Two-Strand Twists", description: "Natural twist style.", price_cents: 12000, duration_min: 180 },
          { name: "Faux Locs", description: "Full faux loc install.", price_cents: 20000, duration_min: 360 },
        ],
      },
    ],
    lengthOptions: [
      { name: "Regular Size", duration_min: 240, price_cents: 0 },
      { name: "Small Size", duration_min: 360, price_cents: 4000 },
      { name: "Jumbo Size", duration_min: 180, price_cents: 0 },
    ],
  },
  nails: {
    categories: [
      {
        name: "Manicures",
        description: "Classic and luxury manicures.",
        variants: [
          { name: "Classic Manicure", description: "Shape, cuticle care and polish.", price_cents: 2500, duration_min: 30 },
          { name: "Gel Manicure", description: "Long-lasting gel polish.", price_cents: 3500, duration_min: 45 },
        ],
      },
      {
        name: "Extensions",
        description: "Length and strength enhancements.",
        variants: [
          { name: "Gel Extension", description: "Gel-built extensions, full set.", price_cents: 6000, duration_min: 75 },
          { name: "Acrylic Full Set", description: "Durable acrylic extensions.", price_cents: 5500, duration_min: 70 },
        ],
      },
    ],
    lengthOptions: [
      { name: "Short", duration_min: 30, price_cents: 0 },
      { name: "Medium", duration_min: 45, price_cents: 500 },
      { name: "Long", duration_min: 60, price_cents: 1000 },
    ],
  },
};

/**
 * Seed an industry starter catalog for the caller's workspace.
 * Authenticated; the caller must own/administer the target workspace.
 */
export const seedIndustryCatalog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        industry: z.enum(["barbershop", "hair_braiding", "nails"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Authorize: caller must be an admin+ on this workspace.
    const { data: allowed, error: roleErr } = await supabase.rpc("has_workspace_role", {
      _workspace_id: data.workspaceId,
      _min_role: "admin",
    });
    if (roleErr) throw new Error(roleErr.message);
    if (!allowed) throw new Error("You don't have permission to set up this workspace.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const tpl = TEMPLATES[data.industry as Industry];

    // Avoid duplicate seeding.
    const { count } = await supabaseAdmin
      .from("service_categories")
      .select("id", { count: "exact", head: true })
      .eq("workspace_id", data.workspaceId);
    if ((count ?? 0) > 0) {
      return { seeded: false, reason: "already_has_catalog" } as const;
    }

    let catSort = 0;
    let createdCategories = 0;
    let createdVariants = 0;

    for (const cat of tpl.categories) {
      const { data: catRow, error: catErr } = await supabaseAdmin
        .from("service_categories")
        .insert({
          workspace_id: data.workspaceId,
          name: cat.name,
          description: cat.description,
          sort_order: catSort++,
        })
        .select("id")
        .single();
      if (catErr) throw new Error(catErr.message);
      createdCategories++;

      let varSort = 0;
      const variantRows = cat.variants.map((v) => ({
        workspace_id: data.workspaceId,
        category_id: catRow.id,
        name: v.name,
        description: v.description ?? null,
        price_cents: v.price_cents,
        duration_min: v.duration_min,
        sort_order: varSort++,
      }));
      const { error: varErr } = await supabaseAdmin.from("service_variants").insert(variantRows);
      if (varErr) throw new Error(varErr.message);
      createdVariants += variantRows.length;
    }

    let lenSort = 0;
    const lengthRows = tpl.lengthOptions.map((l) => ({
      workspace_id: data.workspaceId,
      name: l.name,
      duration_min: l.duration_min,
      price_cents: l.price_cents,
      sort_order: lenSort++,
    }));
    if (lengthRows.length) {
      const { error: lenErr } = await supabaseAdmin.from("service_length_options").insert(lengthRows);
      if (lenErr) throw new Error(lenErr.message);
    }

    void userId;
    return {
      seeded: true,
      createdCategories,
      createdVariants,
      createdLengthOptions: lengthRows.length,
    } as const;
  });
