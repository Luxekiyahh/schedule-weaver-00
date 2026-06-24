import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { constructWebhookEvent, stripeFetch, type StripeEnv } from "@/lib/stripe.server";

// Map Stripe price lookup keys to our plan tiers.
const LOOKUP_TO_TIER: Record<string, "basic" | "pro" | "enterprise"> = {
  basic_monthly: "basic",
  pro_monthly: "pro",
  enterprise_monthly: "enterprise",
};
const SETUP_FEE_LOOKUP_KEY = "setup_fee_onetime";

let _supabase: ReturnType<typeof createClient<any, any, any>> | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient<any, any, any>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }
  return _supabase;
}

function toIso(unixSeconds: number | null | undefined): string | null {
  return typeof unixSeconds === "number" ? new Date(unixSeconds * 1000).toISOString() : null;
}

function periodEndFromSubscription(sub: any): number | undefined {
  return sub?.current_period_end ?? sub?.items?.data?.[0]?.current_period_end;
}
function periodStartFromSubscription(sub: any): number | undefined {
  return sub?.current_period_start ?? sub?.items?.data?.[0]?.current_period_start;
}

/** Upsert the workspace subscription row from a Stripe subscription object. */
async function upsertSubscription(sub: any, env: StripeEnv) {
  const workspaceId = sub?.metadata?.workspaceId;
  if (!workspaceId) {
    console.error("[stripe-webhook] subscription missing metadata.workspaceId", { id: sub?.id });
    return;
  }

  const item = (sub.items?.data ?? []).find(
    (it: any) => LOOKUP_TO_TIER[it?.price?.lookup_key as string],
  );
  const lookupKey: string | undefined = item?.price?.lookup_key;
  if (!lookupKey) {
    console.warn("[stripe-webhook] no plan price on subscription", { id: sub?.id });
    return;
  }

  await getSupabase()
    .from("subscriptions")
    .upsert(
      {
        workspace_id: workspaceId,
        plan_tier: LOOKUP_TO_TIER[lookupKey],
        price_id: lookupKey,
        status: sub.status,
        stripe_subscription_id: sub.id,
        stripe_customer_id: typeof sub.customer === "string" ? sub.customer : sub.customer?.id,
        current_period_start: toIso(periodStartFromSubscription(sub)),
        current_period_end: toIso(periodEndFromSubscription(sub)),
        cancel_at_period_end: Boolean(sub.cancel_at_period_end),
        environment: env,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "workspace_id,environment" },
    );
}

async function markCanceled(subscriptionId: string, env: StripeEnv) {
  await getSupabase()
    .from("subscriptions")
    .update({ status: "canceled", updated_at: new Date().toISOString() })
    .eq("stripe_subscription_id", subscriptionId)
    .eq("environment", env);
}

/** Queue a one-off welcome email (idempotent via message_id). */
async function sendWelcomeEmail(workspaceId: string, toEmail: string | null | undefined) {
  if (!toEmail) return;
  const { data: ws } = await getSupabase()
    .from("workspaces")
    .select("name")
    .eq("id", workspaceId)
    .maybeSingle();
  const businessName = (ws as { name?: string } | null)?.name ?? "your business";

  const html = `
    <div style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:0 auto;color:#0f172a">
      <h1 style="font-size:22px">Welcome to ProcSchedule 🎉</h1>
      <p>Your subscription for <strong>${businessName}</strong> is active. We're getting your booking site and automations ready.</p>
      <p>You can manage your plan and booking settings any time from your dashboard.</p>
      <p style="margin-top:24px">
        <a href="https://procschedule.com/dashboard/home" style="background:#4f46e5;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Go to dashboard</a>
      </p>
      <p style="color:#64748b;font-size:13px;margin-top:32px">— The ProcSchedule team</p>
    </div>`;

  await getSupabase().rpc("enqueue_email", {
    queue_name: "transactional_emails",
    payload: {
      to: toEmail,
      from: "ProcSchedule <hello@notify.procschedule.com>",
      sender_domain: "notify.procschedule.com",
      subject: "Welcome to ProcSchedule",
      html,
      purpose: "transactional",
      label: "welcome",
      message_id: `welcome-${workspaceId}`,
      idempotency_key: `welcome-${workspaceId}`,
      queued_at: new Date().toISOString(),
    },
  });
}

async function handleCheckoutCompleted(session: any, env: StripeEnv) {
  const workspaceId = session?.metadata?.workspaceId || session?.client_reference_id;
  if (!workspaceId) return;

  // Mark the one-time setup fee paid when it was part of the checkout.
  if (session?.metadata?.includeSetupFee === "true") {
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
  } else {
    // Confirm against line items in case metadata is missing.
    const items = await stripeFetch<{ data: any[] }>(
      env,
      `/v1/checkout/sessions/${session.id}/line_items`,
      { params: { "expand[]": "data.price" } },
    ).catch(() => ({ data: [] as any[] }));
    const hasSetupFee = (items.data ?? []).some(
      (li: any) => li?.price?.lookup_key === SETUP_FEE_LOOKUP_KEY,
    );
    if (hasSetupFee) {
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
  }

  // Pull the full subscription so tier/period are populated immediately.
  if (session.subscription) {
    const sub = await stripeFetch(
      env,
      `/v1/subscriptions/${session.subscription}`,
      { params: { "expand[]": "items.data.price" } },
    );
    await upsertSubscription(sub, env);
  }

  // Welcome email (purchase business logic).
  await sendWelcomeEmail(workspaceId, session?.customer_details?.email || session?.customer_email);
}

async function handleWebhook(req: Request, env: StripeEnv) {
  const signature = req.headers.get("stripe-signature");
  const body = await req.text();
  if (!signature) throw new Error("Missing stripe-signature header");

  const event = constructWebhookEvent(body, signature, env);

  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutCompleted(event.data.object, env);
      break;
    case "customer.subscription.created":
    case "customer.subscription.updated":
      await upsertSubscription(event.data.object, env);
      break;
    case "customer.subscription.deleted":
      await markCanceled((event.data.object as any).id, env);
      break;
    default:
      console.log("[stripe-webhook] Unhandled event:", event.type);
  }
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const env = (url.searchParams.get("env") || "sandbox") as StripeEnv;
        try {
          await handleWebhook(request, env);
          return Response.json({ received: true });
        } catch (e) {
          console.error("[stripe-webhook] error:", e);
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});
