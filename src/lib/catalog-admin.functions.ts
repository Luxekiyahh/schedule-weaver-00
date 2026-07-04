import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Admin catalog management for a tenant workspace.
 *
 * Two surfaces read the catalog and must stay coherent:
 *   - Public storefront (getStorefront) reads `service_variants` grouped by
 *     `service_categories` (active only).
 *   - Booking flow (getBookingWorkspace) reads the `services` table via
 *     `category_id`, and offers a service only when a member is linked in
 *     `service_providers`.
 *
 * `service_categories` is shared by both, so these functions edit it in place
 * (never delete a category that still has items) and expose both variants and
 * services so the operator can see exactly what each surface will render.
 */

type Ctx = { workspaceId: string; role: string };

/**
 * Resolve the caller's active workspace membership and require owner/admin.
 * Every mutation re-checks that the target rows belong to this workspace.
 */
async function requireAdminWorkspace(userId: string): Promise<Ctx> {
  const { data: mem, error } = await supabaseAdmin
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("user_id", userId)
    .eq("is_active", true)
    .in("role", ["owner", "admin"])
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!mem) throw new Error("You do not have permission to manage this catalog.");
  return { workspaceId: mem.workspace_id, role: mem.role };
}

// ============================================================
// Read
// ============================================================

export const getCatalogAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { workspaceId, role } = await requireAdminWorkspace(context.userId);

    const [
      { data: ws },
      { data: categories },
      { data: variants },
      { data: services },
      { data: members },
      { data: links },
    ] = await Promise.all([
      supabaseAdmin.from("workspaces").select("id, name, slug").eq("id", workspaceId).maybeSingle(),
      supabaseAdmin
        .from("service_categories")
        .select("id, name, description, sort_order, active")
        .eq("workspace_id", workspaceId)
        .order("sort_order", { ascending: true }),
      supabaseAdmin
        .from("service_variants")
        .select("id, category_id, name, price_cents, duration_min, active, sort_order")
        .eq("workspace_id", workspaceId)
        .order("sort_order", { ascending: true }),
      supabaseAdmin
        .from("services")
        .select("id, name, category_id, price_cents, duration_minutes, is_active")
        .eq("workspace_id", workspaceId)
        .order("price_cents", { ascending: true }),
      supabaseAdmin
        .from("workspace_members")
        .select("id, user_id")
        .eq("workspace_id", workspaceId)
        .eq("is_active", true)
        .in("role", ["owner", "admin", "staff"]),
      supabaseAdmin
        .from("service_providers")
        .select("service_id, member_id")
        .eq("workspace_id", workspaceId),
    ]);

    const userIds = (members ?? []).map((m) => m.user_id);
    const { data: profs } = userIds.length
      ? await supabaseAdmin.from("profiles").select("id, full_name").in("id", userIds)
      : { data: [] as { id: string; full_name: string | null }[] };
    const nameMap = new Map((profs ?? []).map((p) => [p.id, p.full_name]));

    const providers = (members ?? []).map((m) => ({
      member_id: m.id,
      name: nameMap.get(m.user_id) ?? "Team member",
    }));

    return {
      workspace: ws ?? null,
      role,
      categories: categories ?? [],
      variants: variants ?? [],
      services: services ?? [],
      providers,
      links: links ?? [],
    };
  });

// ============================================================
// Category mutations
// ============================================================

const categorySchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(240).nullable().optional(),
  active: z.boolean().optional().default(true),
});

export const saveCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => categorySchema.parse(input))
  .handler(async ({ data, context }) => {
    const { workspaceId } = await requireAdminWorkspace(context.userId);

    if (data.id) {
      // Ensure the category belongs to this workspace before updating.
      const { data: existing } = await supabaseAdmin
        .from("service_categories")
        .select("id")
        .eq("id", data.id)
        .eq("workspace_id", workspaceId)
        .maybeSingle();
      if (!existing) throw new Error("Category not found.");
      const { error } = await supabaseAdmin
        .from("service_categories")
        .update({
          name: data.name,
          description: data.description ?? null,
          active: data.active,
        })
        .eq("id", data.id)
        .eq("workspace_id", workspaceId);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }

    // New category goes to the end of the current order.
    const { data: last } = await supabaseAdmin
      .from("service_categories")
      .select("sort_order")
      .eq("workspace_id", workspaceId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextOrder = (last?.sort_order ?? 0) + 1;

    const { data: inserted, error } = await supabaseAdmin
      .from("service_categories")
      .insert({
        workspace_id: workspaceId,
        name: data.name,
        description: data.description ?? null,
        active: data.active,
        sort_order: nextOrder,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: inserted.id };
  });

export const deleteCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { workspaceId } = await requireAdminWorkspace(context.userId);

    // Guard: refuse to delete a category that still has items, so the
    // storefront (variants) and booking (services) never end up orphaned.
    const [{ count: varCount }, { count: svcCount }] = await Promise.all([
      supabaseAdmin
        .from("service_variants")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .eq("category_id", data.id),
      supabaseAdmin
        .from("services")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId)
        .eq("category_id", data.id),
    ]);
    if ((varCount ?? 0) > 0 || (svcCount ?? 0) > 0) {
      throw new Error(
        "Move its menu items and services to another category before deleting it.",
      );
    }

    const { error } = await supabaseAdmin
      .from("service_categories")
      .delete()
      .eq("id", data.id)
      .eq("workspace_id", workspaceId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const reorderCategories = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ orderedIds: z.array(z.string().uuid()).min(1).max(100) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { workspaceId } = await requireAdminWorkspace(context.userId);
    // Apply sequential sort_order; scope every write to the workspace.
    for (let i = 0; i < data.orderedIds.length; i++) {
      const { error } = await supabaseAdmin
        .from("service_categories")
        .update({ sort_order: i + 1 })
        .eq("id", data.orderedIds[i])
        .eq("workspace_id", workspaceId);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

// ============================================================
// Move an item (storefront variant or bookable service) between categories
// ============================================================

export const setVariantCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({ variantId: z.string().uuid(), categoryId: z.string().uuid() })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { workspaceId } = await requireAdminWorkspace(context.userId);
    await assertCategoryInWorkspace(data.categoryId, workspaceId);
    const { error } = await supabaseAdmin
      .from("service_variants")
      .update({ category_id: data.categoryId })
      .eq("id", data.variantId)
      .eq("workspace_id", workspaceId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setServiceCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({ serviceId: z.string().uuid(), categoryId: z.string().uuid() })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { workspaceId } = await requireAdminWorkspace(context.userId);
    await assertCategoryInWorkspace(data.categoryId, workspaceId);
    const { error } = await supabaseAdmin
      .from("services")
      .update({ category_id: data.categoryId })
      .eq("id", data.serviceId)
      .eq("workspace_id", workspaceId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

async function assertCategoryInWorkspace(categoryId: string, workspaceId: string) {
  const { data } = await supabaseAdmin
    .from("service_categories")
    .select("id")
    .eq("id", categoryId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (!data) throw new Error("Category not found.");
}

// ============================================================
// Provider assignments
// ============================================================

export const setServiceProviders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        serviceId: z.string().uuid(),
        memberIds: z.array(z.string().uuid()).max(100),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { workspaceId } = await requireAdminWorkspace(context.userId);

    // Service must belong to this workspace.
    const { data: svc } = await supabaseAdmin
      .from("services")
      .select("id")
      .eq("id", data.serviceId)
      .eq("workspace_id", workspaceId)
      .maybeSingle();
    if (!svc) throw new Error("Service not found.");

    // Only accept members that actually belong to this workspace.
    let validIds: string[] = [];
    if (data.memberIds.length) {
      const { data: members } = await supabaseAdmin
        .from("workspace_members")
        .select("id")
        .eq("workspace_id", workspaceId)
        .eq("is_active", true)
        .in("id", data.memberIds);
      validIds = (members ?? []).map((m) => m.id);
    }

    // Replace the link set for this service.
    const { error: delErr } = await supabaseAdmin
      .from("service_providers")
      .delete()
      .eq("workspace_id", workspaceId)
      .eq("service_id", data.serviceId);
    if (delErr) throw new Error(delErr.message);

    if (validIds.length) {
      const { error: insErr } = await supabaseAdmin.from("service_providers").insert(
        validIds.map((memberId) => ({
          workspace_id: workspaceId,
          service_id: data.serviceId,
          member_id: memberId,
        })),
      );
      if (insErr) throw new Error(insErr.message);
    }
    return { ok: true, count: validIds.length };
  });
