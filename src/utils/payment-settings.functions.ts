import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Per-tenant payment configuration (Phase 2A).
 *
 * This lets each workspace owner decide *who collects guest payments* on their
 * booking site (Stripe, PayPal, or Square) and *how much* is taken upfront
 * (none, a deposit, or full payment). Connecting a provider account (OAuth /
 * Stripe Connect) and actually charging guests arrives in Phase 2B/2C — for now
 * this stores intent and policy so the admin and booking surfaces can render.
 */

export const PROVIDERS = ["none", "stripe", "paypal", "square"] as const;
export type PaymentProvider = (typeof PROVIDERS)[number];

export const DEPOSIT_TYPES = ["none", "deposit", "full"] as const;
export type DepositType = (typeof DEPOSIT_TYPES)[number];

export interface PaymentSettings {
  workspaceId: string;
  provider: PaymentProvider;
  connectionStatus: "disconnected" | "pending" | "connected" | "error";
  providerAccountId: string | null;
  platformFeePercent: number;
  depositType: DepositType;
  depositAmountCents: number;
  depositPercent: number;
  currency: string;
}

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

const DEFAULTS = {
  provider: "none" as PaymentProvider,
  connection_status: "disconnected" as const,
  provider_account_id: null as string | null,
  platform_fee_percent: 2,
  deposit_type: "none" as DepositType,
  deposit_amount_cents: 0,
  deposit_percent: 0,
  currency: "USD",
};

function rowToSettings(workspaceId: string, row: Record<string, unknown> | null): PaymentSettings {
  const r = row ?? DEFAULTS;
  return {
    workspaceId,
    provider: (r.provider as PaymentProvider) ?? "none",
    connectionStatus: (r.connection_status as PaymentSettings["connectionStatus"]) ?? "disconnected",
    providerAccountId: (r.provider_account_id as string | null) ?? null,
    platformFeePercent: Number(r.platform_fee_percent ?? 2),
    depositType: (r.deposit_type as DepositType) ?? "none",
    depositAmountCents: Number(r.deposit_amount_cents ?? 0),
    depositPercent: Number(r.deposit_percent ?? 0),
    currency: (r.currency as string) ?? "USD",
  };
}

/** Read the workspace's payment settings (returns sane defaults if unset). */
export const getPaymentSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ workspaceId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<PaymentSettings> => {
    await assertWorkspaceMember(context.userId, data.workspaceId);
    const { data: row } = await supabaseAdmin
      .from("workspace_payment_settings")
      .select("*")
      .eq("workspace_id", data.workspaceId)
      .maybeSingle();
    return rowToSettings(data.workspaceId, row);
  });

/** Create or update the workspace's payment policy. */
export const savePaymentSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        provider: z.enum(PROVIDERS),
        depositType: z.enum(DEPOSIT_TYPES),
        depositAmountCents: z.number().int().min(0).max(100_000_00).default(0),
        depositPercent: z.number().min(0).max(100).default(0),
        currency: z.string().min(3).max(3).default("USD"),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<PaymentSettings> => {
    await assertWorkspaceMember(context.userId, data.workspaceId);

    // Switching provider always resets the connection state — a new provider
    // must be reconnected before it can collect payments.
    const { data: existing } = await supabaseAdmin
      .from("workspace_payment_settings")
      .select("provider, connection_status, provider_account_id")
      .eq("workspace_id", data.workspaceId)
      .maybeSingle();

    const providerChanged = !existing || existing.provider !== data.provider;
    const connection_status = providerChanged ? "disconnected" : existing!.connection_status;
    const provider_account_id = providerChanged ? null : existing!.provider_account_id;

    const payload = {
      workspace_id: data.workspaceId,
      provider: data.provider,
      connection_status,
      provider_account_id,
      deposit_type: data.depositType,
      deposit_amount_cents: data.depositAmountCents,
      deposit_percent: data.depositPercent,
      currency: data.currency.toUpperCase(),
    };

    const { data: row, error } = await supabaseAdmin
      .from("workspace_payment_settings")
      .upsert(payload, { onConflict: "workspace_id" })
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return rowToSettings(data.workspaceId, row);
  });
