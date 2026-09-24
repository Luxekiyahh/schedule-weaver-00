/**
 * Shared guard: workspaces owned by a platform admin (the master operator
 * account) are NOT tenants. They must never expose a public booking page or
 * storefront, and must never accept bookings.
 *
 * Takes the Supabase client as an argument so callers can pass whichever
 * server-side client they already hold (usually `supabaseAdmin`) without this
 * module importing a server-only client at module scope.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function isOwnerPlatformAdmin(client: any, ownerId: string | null | undefined) {
  if (!ownerId) return false;
  const { data } = await client
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", ownerId)
    .maybeSingle();
  return Boolean(data);
}

/**
 * Should this workspace's public storefront be hidden?
 *
 * Admin-owned workspaces have no storefront, EXCEPT when the workspace is
 * explicitly flagged `storefront_enabled` (the operator running their own
 * business on the platform).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function isStorefrontBlocked(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: any,
  ws: { owner_id?: string | null; storefront_enabled?: boolean | null } | null | undefined,
) {
  if (!ws) return true;
  if (ws.storefront_enabled) return false;
  return isOwnerPlatformAdmin(client, ws.owner_id);
}
