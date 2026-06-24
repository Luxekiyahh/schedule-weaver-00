import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { type StripeEnv, stripeFetch } from "@/lib/stripe.server";

/**
 * Provider account onboarding (Phase 2B).
 *
 * Turns the "Connect account" button into real, provider-specific onboarding:
 *  - Stripe   → Stripe Connect (Express) hosted onboarding. Works today via
 *               the Lovable Stripe gateway, no extra credentials required.
 *  - Square   → OAuth (requires SQUARE_APPLICATION_ID / SQUARE_APPLICATION_SECRET).
 *  - PayPal   → OAuth (requires PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET).
 *
 * Square / PayPal stay gated until their credentials are configured; until then
 * we return a clear, actionable message instead of silently doing nothing.
 */

const PROVIDERS = ["stripe", "paypal", "square"] as const;
type ConnectProvider = (typeof PROVIDERS)[number];

async function assertWorkspaceMember(userId: string, workspaceId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", userId)
    .eq("workspace_id", workspaceId)
    .eq("is_active", true)
    .maybeSingle();
  if (!data) throw new Error("You don't have access to this workspace.");
}

type SettingsRow = {
  provider: string | null;
  connection_status: string | null;
  provider_account_id: string | null;
};

async function readSettings(workspaceId: string): Promise<SettingsRow | null> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("workspace_payment_settings")
    .select("provider, connection_status, provider_account_id")
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  return (data as SettingsRow) ?? null;
}

async function updateSettings(
  workspaceId: string,
  patch: Partial<{
    provider: string;
    connection_status: string;
    provider_account_id: string | null;
  }>,
) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin
    .from("workspace_payment_settings")
    .upsert({ workspace_id: workspaceId, ...patch }, { onConflict: "workspace_id" });
  if (error) throw new Error(error.message);
}

/** Begin provider onboarding. Returns either a redirect URL or a gated message. */
export const startProviderConnect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        provider: z.enum(PROVIDERS),
        environment: z.enum(["sandbox", "live"]),
        origin: z.string().url(),
      })
      .parse(input),
  )
  .handler(
    async ({
      data,
      context,
    }): Promise<{ url: string } | { error: string }> => {
      await assertWorkspaceMember(context.userId, data.workspaceId);

      const provider = data.provider as ConnectProvider;
      const env = data.environment as StripeEnv;

      // Make sure the row exists & reflects the chosen provider.
      await updateSettings(data.workspaceId, { provider });

      if (provider === "stripe") {
        try {
          return { url: await startStripeConnect(data.workspaceId, env, data.origin) };
        } catch (e) {
          return {
            error: e instanceof Error ? e.message : "Couldn't start Stripe onboarding.",
          };
        }
      }

      // Square / PayPal — gated until credentials are configured.
      if (provider === "square") {
        const ready =
          !!process.env.SQUARE_APPLICATION_ID && !!process.env.SQUARE_APPLICATION_SECRET;
        if (!ready) {
          return {
            error:
              "Square isn't enabled yet. Add your Square developer credentials and we'll turn on Square onboarding.",
          };
        }
      }
      if (provider === "paypal") {
        const ready =
          !!process.env.PAYPAL_CLIENT_ID && !!process.env.PAYPAL_CLIENT_SECRET;
        if (!ready) {
          return {
            error:
              "PayPal isn't enabled yet. Add your PayPal developer credentials and we'll turn on PayPal onboarding.",
          };
        }
      }

      return { error: "This provider isn't available yet." };
    },
  );

/**
 * Create (or reuse) the workspace's Stripe Express connected account and return
 * a hosted onboarding link.
 */
async function startStripeConnect(
  workspaceId: string,
  env: StripeEnv,
  origin: string,
): Promise<string> {
  const existing = await readSettings(workspaceId);
  let accountId = existing?.provider_account_id ?? null;

  if (!accountId) {
    const account = await stripeFetch<{ id: string }>(env, "/v1/accounts", {
      method: "POST",
      params: {
        type: "express",
        metadata: { workspace_id: workspaceId },
      },
    });
    accountId = account.id;
    await updateSettings(workspaceId, {
      provider: "stripe",
      provider_account_id: accountId,
      connection_status: "pending",
    });
  }

  const returnUrl = `${origin}/dashboard/payments?connect=return`;
  const refreshUrl = `${origin}/dashboard/payments?connect=refresh`;

  const link = await stripeFetch<{ url: string }>(env, "/v1/account_links", {
    method: "POST",
    params: {
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: "account_onboarding",
    },
  });

  return link.url;
}

/** Re-check the connected provider account and update connection_status. */
export const refreshConnectStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        environment: z.enum(["sandbox", "live"]),
      })
      .parse(input),
  )
  .handler(
    async ({
      data,
      context,
    }): Promise<{ connectionStatus: "disconnected" | "pending" | "connected" }> => {
      await assertWorkspaceMember(context.userId, data.workspaceId);
      const settings = await readSettings(data.workspaceId);

      if (settings?.provider !== "stripe" || !settings.provider_account_id) {
        return { connectionStatus: "disconnected" };
      }

      try {
        const account = await stripeFetch<{
          charges_enabled?: boolean;
          details_submitted?: boolean;
        }>(data.environment as StripeEnv, `/v1/accounts/${settings.provider_account_id}`);

        const status = account.charges_enabled
          ? "connected"
          : account.details_submitted
            ? "pending"
            : "pending";

        await updateSettings(data.workspaceId, { connection_status: status });
        return { connectionStatus: status };
      } catch {
        return { connectionStatus: "pending" };
      }
    },
  );
