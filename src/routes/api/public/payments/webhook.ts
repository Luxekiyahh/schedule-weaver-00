import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { verifyWebhook, EventName, type PaddleEnv } from "@/lib/paddle.server";

// Map human-readable Paddle price IDs to our plan tiers.
const PRICE_TO_TIER: Record<string, "basic" | "pro" | "enterprise"> = {
  basic_monthly: "basic",
  pro_monthly: "pro",
  enterprise_monthly: "enterprise",
};
const SETUP_FEE_PRICE_ID = "setup_fee_onetime";

let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }
  return _supabase;
}

async function handleSubscriptionUpsert(data: any, env: PaddleEnv) {
  const { id, customerId, items, status, currentBillingPeriod, customData } = data;

  const workspaceId = customData?.workspaceId;
  if (!workspaceId) {
    console.error("[paddle-webhook] No workspaceId in customData");
    return;
  }

  const item = (items ?? []).find(
    (it: any) => PRICE_TO_TIER[it?.price?.importMeta?.externalId as string],
  );
  const priceExternalId: string | undefined = item?.price?.importMeta?.externalId;
  if (!priceExternalId) {
    console.warn("[paddle-webhook] missing importMeta.externalId for subscription", { id });
    return;
  }
  const tier = PRICE_TO_TIER[priceExternalId];

  await getSupabase()
    .from("subscriptions")
    .upsert(
      {
        workspace_id: workspaceId,
        plan_tier: tier,
        price_id: priceExternalId,
        status,
        paddle_subscription_id: id,
        paddle_customer_id: customerId,
        current_period_end: currentBillingPeriod?.endsAt ?? null,
        environment: env,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "workspace_id,environment" },
    );
}

async function handleSubscriptionCanceled(data: any, env: PaddleEnv) {
  await getSupabase()
    .from("subscriptions")
    .update({ status: "canceled", updated_at: new Date().toISOString() })
    .eq("paddle_subscription_id", data.id)
    .eq("environment", env);
}

async function handleTransactionCompleted(data: any, env: PaddleEnv) {
  // Mark the one-time setup fee as paid when its transaction completes.
  const { items, customData } = data;
  const workspaceId = customData?.workspaceId;
  if (!workspaceId) return;

  const hasSetupFee = (items ?? []).some(
    (it: any) => it?.price?.importMeta?.externalId === SETUP_FEE_PRICE_ID,
  );
  if (!hasSetupFee) return;

  await getSupabase()
    .from("subscriptions")
    .upsert(
      {
        workspace_id: workspaceId,
        setup_fee_paid: true,
        environment: env,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "workspace_id,environment" },
    );
}

async function handleWebhook(req: Request, env: PaddleEnv) {
  const event = await verifyWebhook(req, env);

  switch (event.eventType) {
    case EventName.SubscriptionCreated:
    case EventName.SubscriptionUpdated:
      await handleSubscriptionUpsert(event.data, env);
      break;
    case EventName.SubscriptionCanceled:
      await handleSubscriptionCanceled(event.data, env);
      break;
    case EventName.TransactionCompleted:
      await handleTransactionCompleted(event.data, env);
      break;
    default:
      console.log("[paddle-webhook] Unhandled event:", event.eventType);
  }
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const env = (url.searchParams.get("env") || "sandbox") as PaddleEnv;
        try {
          await handleWebhook(request, env);
          return Response.json({ received: true });
        } catch (e) {
          console.error("[paddle-webhook] error:", e);
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});
