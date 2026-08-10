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
