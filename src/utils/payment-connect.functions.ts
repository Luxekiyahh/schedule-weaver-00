import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Bring-your-own-key payment connection (Phase 2B).
 *
 * Each workspace connects its OWN payment account by pasting that provider's
 * API credentials. We validate the keys against the live provider API, store
 * the secrets in a service-role-only table (never exposed to the browser), and
 * keep a non-secret connection status + publishable key on
 * `workspace_payment_settings`.
 *
 * These are the tenant's real provider keys, so we call the provider APIs
 * directly (api.stripe.com / paypal / square) — NOT the Lovable gateway, which
 * only fronts the platform's own managed Stripe account.
 */

const PROVIDERS = ["stripe", "paypal", "square"] as const;

type CredentialsTable = "workspace_payment_credentials";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function assertWorkspaceMember(userId: string, workspaceId: string) {
  const db = await admin();
  const { data } = await db
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", userId)
    .eq("workspace_id", workspaceId)
    .eq("is_active", true)
    .maybeSingle();
  if (!data) throw new Error("You don't have access to this workspace.");
}

// ---- Provider validation (calls the real provider APIs directly) ----

async function validateStripe(secretKey: string): Promise<{
  accountId: string;
  environment: "sandbox" | "live";
}> {
  if (!/^sk_(test|live)_/.test(secretKey) && !/^rk_(test|live)_/.test(secretKey)) {
    throw new Error("That doesn't look like a Stripe secret key (it should start with sk_live_ or sk_test_).");
  }
  const res = await fetch("https://api.stripe.com/v1/account", {
    headers: { Authorization: `Bearer ${secretKey}` },
  });
  const json = (await res.json().catch(() => ({}))) as {
    id?: string;
    error?: { message?: string };
  };
  if (!res.ok) {
    throw new Error(json.error?.message || "Stripe rejected that key. Double-check it and try again.");
  }
  return {
    accountId: json.id ?? "stripe_account",
    environment: secretKey.includes("_live_") ? "live" : "sandbox",
  };
}

async function validatePaypal(
  clientId: string,
  secret: string,
  environment: "sandbox" | "live",
): Promise<{ accountId: string }> {
  const base =
    environment === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
  const basic = Buffer.from(`${clientId}:${secret}`).toString("base64");
  const res = await fetch(`${base}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const json = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    error_description?: string;
  };
  if (!res.ok || !json.access_token) {
    throw new Error(
      json.error_description ||
        "PayPal rejected those credentials. Check the Client ID / Secret and environment.",
    );
  }
  return { accountId: clientId };
}

async function validateSquare(
  accessToken: string,
  environment: "sandbox" | "live",
): Promise<{ accountId: string; locationId: string | null }> {
  const base =
    environment === "live"
      ? "https://connect.squareup.com"
      : "https://connect.squareupsandbox.com";
  const res = await fetch(`${base}/v2/locations`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Square-Version": "2024-10-17",
    },
  });
  const json = (await res.json().catch(() => ({}))) as {
    locations?: Array<{ id?: string; merchant_id?: string }>;
    errors?: Array<{ detail?: string }>;
  };
  if (!res.ok || !json.locations?.length) {
    throw new Error(
      json.errors?.[0]?.detail ||
        "Square rejected that access token. Check the token and environment.",
    );
  }
  const loc = json.locations[0];
  return { accountId: loc.merchant_id ?? "square_account", locationId: loc.id ?? null };
}

/** Save & validate a workspace's own provider credentials. */
export const saveProviderCredentials = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        provider: z.enum(PROVIDERS),
        environment: z.enum(["sandbox", "live"]).default("live"),
        // Stripe
        stripeSecretKey: z.string().trim().optional(),
        stripePublishableKey: z.string().trim().optional(),
        // PayPal
        paypalClientId: z.string().trim().optional(),
        paypalSecret: z.string().trim().optional(),
        // Square
        squareAccessToken: z.string().trim().optional(),
      })
      .parse(input),
  )
  .handler(
    async ({ data, context }): Promise<{ ok: true } | { error: string }> => {
      await assertWorkspaceMember(context.userId, data.workspaceId);
      const db = await admin();

      try {
        let accountId = "";
        let environment = data.environment;
        const credPatch: Record<string, unknown> = {
          workspace_id: data.workspaceId,
          // null out the other providers' secrets when switching
          stripe_secret_key: null,
          paypal_client_id: null,
          paypal_secret: null,
          square_access_token: null,
          square_location_id: null,
        };
        const settingsPatch: Record<string, unknown> = {
          workspace_id: data.workspaceId,
          provider: data.provider,
          stripe_publishable_key: null,
        };

        if (data.provider === "stripe") {
          if (!data.stripeSecretKey) throw new Error("Enter your Stripe secret key.");
          const v = await validateStripe(data.stripeSecretKey);
          accountId = v.accountId;
          environment = v.environment;
          credPatch.stripe_secret_key = data.stripeSecretKey;
          settingsPatch.stripe_publishable_key = data.stripePublishableKey || null;
        } else if (data.provider === "paypal") {
          if (!data.paypalClientId || !data.paypalSecret)
            throw new Error("Enter your PayPal Client ID and Secret.");
          const v = await validatePaypal(data.paypalClientId, data.paypalSecret, data.environment);
          accountId = v.accountId;
          credPatch.paypal_client_id = data.paypalClientId;
          credPatch.paypal_secret = data.paypalSecret;
        } else if (data.provider === "square") {
          if (!data.squareAccessToken) throw new Error("Enter your Square access token.");
          const v = await validateSquare(data.squareAccessToken, data.environment);
          accountId = v.accountId;
          credPatch.square_access_token = data.squareAccessToken;
          credPatch.square_location_id = v.locationId;
        }

        credPatch.environment = environment;

        const { error: credErr } = await (db as any)
          .from("workspace_payment_credentials")
          .upsert(credPatch, { onConflict: "workspace_id" });
        if (credErr) throw new Error(credErr.message);

        settingsPatch.connection_status = "connected";
        settingsPatch.provider_account_id = accountId;
        const { error: setErr } = await (db as any)
          .from("workspace_payment_settings")
          .upsert(settingsPatch, { onConflict: "workspace_id" });
        if (setErr) throw new Error(setErr.message);

        return { ok: true };
      } catch (e) {
        return { error: e instanceof Error ? e.message : "Couldn't verify those credentials." };
      }
    },
  );

/** Disconnect a provider — wipes stored secrets and resets status. */
export const disconnectProvider = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ workspaceId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    await assertWorkspaceMember(context.userId, data.workspaceId);
    const db = await admin();
    await db
      .from(("workspace_payment_credentials" as CredentialsTable))
      .delete()
      .eq("workspace_id", data.workspaceId);
    await db
      .from("workspace_payment_settings")
      .update({ connection_status: "disconnected", provider_account_id: null, stripe_publishable_key: null })
      .eq("workspace_id", data.workspaceId);
    return { ok: true };
  });
