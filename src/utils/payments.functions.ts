import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { stripeFetch, resolvePrice, type StripeEnv } from "@/lib/stripe.server";

const envSchema = z.enum(["sandbox", "live"]);

/** Confirm the signed-in user is an active member of the workspace. */
async function assertWorkspaceMember(userId: string, workspaceId: string) {
  const { data } = await supabaseAdmin
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", userId)
    .eq("workspace_id", workspaceId)
    .eq("is_active", true)
    .maybeSingle();
  if (!data) throw new Error("You don't have access to this workspace.");
}

/**
 * Create a Stripe Checkout Session (hosted) for a subscription plan, optionally
 * bundling the one-time setup fee on the first invoice. Returns the URL the
 * client should redirect the customer to.
 */
export const createCheckoutSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        environment: envSchema,
        priceLookupKeys: z.array(z.string().min(1)).min(1).max(5),
        includeSetupFee: z.boolean().default(false),
        customerEmail: z.string().email().optional(),
        successPath: z.string().default("/dashboard/home"),
        cancelPath: z.string().default("/pricing"),
        origin: z.string().url(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertWorkspaceMember(context.userId, data.workspaceId);
    const env = data.environment as StripeEnv;

    // Resolve all requested prices (plan + optional setup fee).
    const resolved = await Promise.all(
      data.priceLookupKeys.map((key) => resolvePrice(env, key)),
    );
    const isSubscription = resolved.some((p) => p.recurring);

    const lineItems = resolved.map((p) => ({ price: p.id, quantity: 1 }));

    const metadata = {
      workspaceId: data.workspaceId,
      includeSetupFee: data.includeSetupFee ? "true" : "false",
    };

    const params: Record<string, unknown> = {
      mode: isSubscription ? "subscription" : "payment",
      line_items: lineItems,
      success_url: `${data.origin}${data.successPath}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${data.origin}${data.cancelPath}?checkout=cancelled`,
      client_reference_id: data.workspaceId,
      metadata,
      // Full tax handling (the user opted into automatic tax).
      automatic_tax: { enabled: true },
      billing_address_collection: "required",
      tax_id_collection: { enabled: true },
      allow_promotion_codes: true,
    };

    if (data.customerEmail) params.customer_email = data.customerEmail;

    if (isSubscription) {
      params.subscription_data = { metadata };
    } else {
      params.payment_intent_data = { metadata };
    }

    let session: { id: string; url: string };
    try {
      session = await stripeFetch(env, "/v1/checkout/sessions", { method: "POST", params });
    } catch (err) {
      // Automatic tax can't be enabled until the Stripe account's head-office
      // address is configured (done during go-live verification). Fall back to
      // a working checkout without automatic tax so customers can still pay.
      const message = err instanceof Error ? err.message.toLowerCase() : "";
      if (!message.includes("tax")) throw err;
      delete params.automatic_tax;
      delete params.tax_id_collection;
      session = await stripeFetch(env, "/v1/checkout/sessions", { method: "POST", params });
    }

    return { id: session.id, url: session.url };
  });

/**
 * Open the hosted Stripe customer portal so the user can update payment
 * methods, view invoices, or cancel. Returns the portal URL (opens in a new tab).
 */
export const createPortalSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        environment: envSchema,
        returnPath: z.string().default("/dashboard/billing"),
        origin: z.string().url(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertWorkspaceMember(context.userId, data.workspaceId);
    const env = data.environment as StripeEnv;

    const { data: sub } = await supabaseAdmin
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("workspace_id", data.workspaceId)
      .eq("environment", env)
      .maybeSingle();

    const customerId = (sub as { stripe_customer_id?: string } | null)?.stripe_customer_id;
    if (!customerId) throw new Error("No billing account found yet. Choose a plan first.");

    const session = await stripeFetch<{ url: string }>(
      env,
      "/v1/billing_portal/sessions",
      {
        method: "POST",
        params: {
          customer: customerId,
          return_url: `${data.origin}${data.returnPath}`,
        },
      },
    );

    return { url: session.url };
  });

/**
 * Switch an existing subscription to a different plan, immediately, with
 * proration (the user opted into "immediate + proration").
 */
export const changeSubscriptionPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        environment: envSchema,
        priceLookupKey: z.string().min(1),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertWorkspaceMember(context.userId, data.workspaceId);
    const env = data.environment as StripeEnv;

    const { data: sub } = await supabaseAdmin
      .from("subscriptions")
      .select("stripe_subscription_id")
      .eq("workspace_id", data.workspaceId)
      .eq("environment", env)
      .maybeSingle();

    const subscriptionId = (sub as { stripe_subscription_id?: string } | null)?.stripe_subscription_id;
    if (!subscriptionId) throw new Error("No active subscription to change.");

    // Fetch the current subscription to get its item id.
    const current = await stripeFetch<{ items: { data: { id: string }[] } }>(
      env,
      `/v1/subscriptions/${subscriptionId}`,
    );
    const itemId = current.items?.data?.[0]?.id;
    if (!itemId) throw new Error("Could not read current subscription item.");

    const newPrice = await resolvePrice(env, data.priceLookupKey);

    await stripeFetch(env, `/v1/subscriptions/${subscriptionId}`, {
      method: "POST",
      params: {
        items: [{ id: itemId, price: newPrice.id }],
        proration_behavior: "create_prorations",
        payment_behavior: "error_if_incomplete",
      },
    });

    return { ok: true };
  });

// Map Stripe price lookup keys to our plan tiers (mirrors the webhook handler).
const LOOKUP_TO_TIER: Record<string, "basic" | "pro" | "enterprise"> = {
  basic_monthly: "basic",
  pro_monthly: "pro",
  enterprise_monthly: "enterprise",
  basic_yearly: "basic",
  pro_yearly: "pro",
  enterprise_yearly: "enterprise",
};

function toIso(unixSeconds: number | null | undefined): string | null {
  return typeof unixSeconds === "number" ? new Date(unixSeconds * 1000).toISOString() : null;
}

/**
 * Reconcile the workspace's subscription row directly from Stripe. This makes
 * the billing page self-heal when a webhook was missed or landed in the wrong
 * environment: it searches Stripe for subscriptions stamped with this
 * workspace's metadata, then upserts the most relevant one into our table with
 * the correct `environment`. Returns the resolved subscription summary (or null).
 */
export const syncWorkspaceSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        environment: envSchema,
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertWorkspaceMember(context.userId, data.workspaceId);
    const env = data.environment as StripeEnv;

    // Search Stripe for subscriptions tagged with this workspace.
    let subs: any[] = [];
    try {
      const search = await stripeFetch<{ data: any[] }>(env, "/v1/subscriptions/search", {
        params: {
          query: `metadata['workspaceId']:'${data.workspaceId}'`,
          limit: 10,
          "expand[]": "data.items.data.price",
        },
      });
      subs = search.data ?? [];
    } catch {
      subs = [];
    }

    if (subs.length === 0) {
      return { synced: false, status: null as string | null, tier: null as string | null };
    }

    // Prefer an active/trialing subscription, else the most recently created.
    const ACTIVE = ["trialing", "active", "past_due"];
    subs.sort((a, b) => {
      const aActive = ACTIVE.includes(a.status) ? 1 : 0;
      const bActive = ACTIVE.includes(b.status) ? 1 : 0;
      if (aActive !== bActive) return bActive - aActive;
      return (b.created ?? 0) - (a.created ?? 0);
    });
    const sub = subs[0];

    const item = (sub.items?.data ?? []).find(
      (it: any) => LOOKUP_TO_TIER[it?.price?.lookup_key as string],
    );
    const lookupKey: string | undefined = item?.price?.lookup_key;
    if (!lookupKey) {
      return { synced: false, status: sub.status as string, tier: null as string | null };
    }

    const periodEnd = sub?.current_period_end ?? sub?.items?.data?.[0]?.current_period_end;
    const periodStart = sub?.current_period_start ?? sub?.items?.data?.[0]?.current_period_start;

    await supabaseAdmin.from("subscriptions").upsert(
      {
        workspace_id: data.workspaceId,
        plan_tier: LOOKUP_TO_TIER[lookupKey],
        price_id: lookupKey,
        status: sub.status,
        stripe_subscription_id: sub.id,
        stripe_customer_id: typeof sub.customer === "string" ? sub.customer : sub.customer?.id,
        current_period_start: toIso(periodStart),
        current_period_end: toIso(periodEnd),
        cancel_at_period_end: Boolean(sub.cancel_at_period_end),
        environment: env,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "workspace_id,environment" },
    );

    return { synced: true, status: sub.status as string, tier: LOOKUP_TO_TIER[lookupKey] };
  });
