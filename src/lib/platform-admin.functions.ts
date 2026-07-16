import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Platform-operator tools for managing and troubleshooting tenants.
 *
 * Every function verifies the caller is a platform admin via is_platform_admin()
 * before performing any privileged work.
 */

const PROJECT_URL = "https://project--b242ffaf-aba9-404d-ae2f-439da5daa84a.lovable.app";

async function assertPlatformAdmin(context: { supabase: any }) {
  const { data: ok, error } = await context.supabase.rpc("is_platform_admin");
  if (error) throw new Error("Authorization check failed.");
  if (ok !== true) throw new Error("Forbidden: platform admin access required.");
}

export const isPlatformAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.rpc("is_platform_admin");
    return { isPlatformAdmin: data === true };
  });

// Paywall bypass is intentionally restricted to a single, verified master
// account email. It is *not* tied to platform_admins so future admins added
// to that table cannot silently skip billing.
const BILLING_BYPASS_EMAILS = new Set<string>(["takiyah472@gmail.com"]);

export const isBillingBypassed = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const email = (context.claims?.email as string | undefined)?.toLowerCase() ?? "";
    return { bypassed: email !== "" && BILLING_BYPASS_EMAILS.has(email) };
  });

// ---- Existing subdomain tooling -------------------------------------------

export const listTenantDomains = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertPlatformAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("workspaces")
      .select("id, name, slug, domain_status, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { tenants: data ?? [] };
  });

export const setTenantDomainStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        domainStatus: z.enum(["pending", "active"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertPlatformAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("workspaces")
      .update({ domain_status: data.domainStatus })
      .eq("id", data.workspaceId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---- Tenant overview + detail ---------------------------------------------

export const listTenants = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertPlatformAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [wsRes, subsRes, profilesRes] = await Promise.all([
      supabaseAdmin
        .from("workspaces")
        .select("id, name, slug, domain_status, suspended_at, created_at, owner_id")
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("subscriptions")
        .select("workspace_id, plan_tier, status, current_period_end, environment, created_at")
        .order("created_at", { ascending: false }),
      supabaseAdmin.from("profiles").select("id, email, full_name"),
    ]);

    if (wsRes.error) throw new Error(wsRes.error.message);

    const subByWs = new Map<string, any>();
    for (const s of subsRes.data ?? []) {
      if (!subByWs.has(s.workspace_id)) subByWs.set(s.workspace_id, s);
    }
    const profileById = new Map<string, any>();
    for (const p of profilesRes.data ?? []) profileById.set(p.id, p);

    const tenants = (wsRes.data ?? []).map((w) => {
      const sub = subByWs.get(w.id);
      let status: string;
      if (w.suspended_at) status = "suspended";
      else if (!sub) status = "no_subscription";
      else if (sub.status === "trialing") status = "trial";
      else if (sub.status === "past_due" || sub.status === "unpaid") status = "past_due";
      else if (sub.status === "active") status = "active";
      else status = sub.status ?? "unknown";
      const owner = profileById.get(w.owner_id);
      return {
        id: w.id,
        name: w.name,
        slug: w.slug,
        domain_status: w.domain_status,
        suspended_at: w.suspended_at,
        created_at: w.created_at,
        status,
        plan_tier: sub?.plan_tier ?? null,
        current_period_end: sub?.current_period_end ?? null,
        owner_email: owner?.email ?? null,
        owner_name: owner?.full_name ?? null,
      };
    });

    return { tenants };
  });

export const getTenantDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ workspaceId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertPlatformAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const wsId = data.workspaceId;

    const [wsRes, subRes, servicesRes, apptsRes, paymentRes, emailRes, smsRes] =
      await Promise.all([
        supabaseAdmin
          .from("workspaces")
          .select(
            "id, name, slug, domain_status, suspended_at, suspended_reason, created_at, owner_id, business_address, business_phone, business_email, notify_mobile",
          )
          .eq("id", wsId)
          .maybeSingle(),
        supabaseAdmin
          .from("subscriptions")
          .select("plan_tier, status, environment, current_period_end, cancel_at_period_end, created_at")
          .eq("workspace_id", wsId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabaseAdmin
          .from("services")
          .select("id, name, price_cents, duration_minutes, currency, is_active")
          .eq("workspace_id", wsId)
          .order("created_at", { ascending: false })
          .limit(50),
        supabaseAdmin
          .from("appointments")
          .select("id, status, start_at, end_at, created_at, service_id, customer_id")
          .eq("workspace_id", wsId)
          .order("created_at", { ascending: false })
          .limit(25),
        supabaseAdmin
          .from("workspace_payment_settings")
          .select("provider, connection_status, deposit_type, deposit_amount_cents, deposit_percent, currency")
          .eq("workspace_id", wsId)
          .maybeSingle(),
        supabaseAdmin
          .from("email_send_log")
          .select("id, template_name, recipient_email, status, error_message, created_at")
          .order("created_at", { ascending: false })
          .limit(200),
        supabaseAdmin
          .from("sms_send_log")
          .select("id, to_number, purpose, status, error_message, created_at")
          .eq("workspace_id", wsId)
          .order("created_at", { ascending: false })
          .limit(25),
      ]);

    if (!wsRes.data) throw new Error("Tenant not found.");

    // Hydrate appointment customer + service names.
    const custIds = [...new Set((apptsRes.data ?? []).map((a) => a.customer_id).filter(Boolean))];
    const svcIds = [...new Set((apptsRes.data ?? []).map((a) => a.service_id).filter(Boolean))];
    const [custRes, apptSvcRes] = await Promise.all([
      custIds.length
        ? supabaseAdmin.from("customers").select("id, full_name, email, phone").in("id", custIds)
        : Promise.resolve({ data: [] as any[] }),
      svcIds.length
        ? supabaseAdmin.from("services").select("id, name").in("id", svcIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);
    const custById = new Map((custRes.data ?? []).map((c: any) => [c.id, c]));
    const svcById = new Map((apptSvcRes.data ?? []).map((s: any) => [s.id, s]));

    const appointments = (apptsRes.data ?? []).map((a) => ({
      ...a,
      customer: custById.get(a.customer_id) ?? null,
      service_name: svcById.get(a.service_id)?.name ?? null,
    }));

    // Owner email for context.
    const { data: ownerRes } = await supabaseAdmin.auth.admin.getUserById(wsRes.data.owner_id);

    // email_send_log has no workspace_id, so scope by owner + customer emails.
    const relevantEmails = new Set<string>();
    if (ownerRes?.user?.email) relevantEmails.add(ownerRes.user.email.toLowerCase());
    for (const c of custRes.data ?? []) if ((c as any).email) relevantEmails.add((c as any).email.toLowerCase());
    const emailLogs = (emailRes.data ?? [])
      .filter((e) => e.recipient_email && relevantEmails.has(e.recipient_email.toLowerCase()))
      .slice(0, 25);

    return {
      workspace: { ...wsRes.data, owner_email: ownerRes?.user?.email ?? null },
      subscription: subRes.data ?? null,
      services: servicesRes.data ?? [],
      appointments,
      payment: paymentRes.data ?? null,
      emailLogs,
      smsLogs: smsRes.data ?? [],
    };
  });

// ---- Suspend / reactivate --------------------------------------------------

export const suspendTenant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        workspaceId: z.string().uuid(),
        reason: z.string().trim().max(500).optional().default(""),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertPlatformAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("workspaces")
      .update({
        suspended_at: new Date().toISOString(),
        suspended_reason: data.reason || null,
        suspended_by: context.userId,
      })
      .eq("id", data.workspaceId);
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("admin_audit_log").insert({
      actor_id: context.userId,
      action: "suspend_tenant",
      target_workspace_id: data.workspaceId,
      detail: { reason: data.reason || null },
    });
    return { ok: true };
  });

export const reactivateTenant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ workspaceId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertPlatformAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("workspaces")
      .update({ suspended_at: null, suspended_reason: null, suspended_by: null })
      .eq("id", data.workspaceId);
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("admin_audit_log").insert({
      actor_id: context.userId,
      action: "reactivate_tenant",
      target_workspace_id: data.workspaceId,
    });
    return { ok: true };
  });

// ---- Full dashboard impersonation -----------------------------------------

export const impersonateTenant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ workspaceId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertPlatformAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: ws } = await supabaseAdmin
      .from("workspaces")
      .select("owner_id, name")
      .eq("id", data.workspaceId)
      .maybeSingle();
    if (!ws) throw new Error("Tenant not found.");

    const { data: ownerRes } = await supabaseAdmin.auth.admin.getUserById(ws.owner_id);
    const email = ownerRes?.user?.email;
    if (!email) throw new Error("Owner has no email on file.");

    const { data: link, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });
    if (linkErr || !link?.properties?.hashed_token) {
      throw new Error(linkErr?.message || "Could not create impersonation session.");
    }

    await supabaseAdmin.from("admin_audit_log").insert({
      actor_id: context.userId,
      action: "impersonate_tenant",
      target_workspace_id: data.workspaceId,
      detail: { owner_email: email },
    });

    return { tokenHash: link.properties.hashed_token, email };
  });

// ---- Manual action triggers -----------------------------------------------

export const resendWelcomeEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ workspaceId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertPlatformAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: ws } = await supabaseAdmin
      .from("workspaces")
      .select("owner_id, name")
      .eq("id", data.workspaceId)
      .maybeSingle();
    if (!ws) throw new Error("Tenant not found.");
    const { data: ownerRes } = await supabaseAdmin.auth.admin.getUserById(ws.owner_id);
    const email = ownerRes?.user?.email;
    if (!email) throw new Error("Owner has no email on file.");

    const { enqueueTransactionalEmail } = await import("@/lib/email/dispatch.server");
    const res = await enqueueTransactionalEmail({
      templateName: "welcome",
      recipientEmail: email,
      idempotencyKey: `welcome-resend-${data.workspaceId}-${Date.now()}`,
      templateData: {
        firstName: (ownerRes?.user?.user_metadata?.full_name as string) || ws.name,
        businessName: ws.name,
        dashboardUrl: "https://procschedule.com/dashboard/home",
        supportEmail: "admin@procschedule.com",
      },
    });
    if (!res.ok) throw new Error(`Email not sent: ${res.reason}`);

    await supabaseAdmin.from("admin_audit_log").insert({
      actor_id: context.userId,
      action: "resend_welcome_email",
      target_workspace_id: data.workspaceId,
      detail: { email },
    });
    return { ok: true, email };
  });

export const resendConfirmationSms = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ appointmentId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertPlatformAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: appt } = await supabaseAdmin
      .from("appointments")
      .select("id, workspace_id, service_id, customer_id, start_at, end_at, notes")
      .eq("id", data.appointmentId)
      .maybeSingle();
    if (!appt) throw new Error("Appointment not found.");

    const [custRes, wsRes, svcRes] = await Promise.all([
      supabaseAdmin.from("customers").select("full_name, phone").eq("id", appt.customer_id).maybeSingle(),
      supabaseAdmin
        .from("workspaces")
        .select("name, business_address, business_phone, business_email, business_website")
        .eq("id", appt.workspace_id)
        .maybeSingle(),
      supabaseAdmin.from("services").select("name, price_cents, currency").eq("id", appt.service_id).maybeSingle(),
    ]);
    const customer = custRes.data;
    const workspace = wsRes.data;
    const service = svcRes.data;
    if (!customer?.phone) throw new Error("Customer has no phone number on file.");
    if (!workspace || !service) throw new Error("Missing workspace or service data.");

    const start = new Date(appt.start_at);
    const end = new Date(appt.end_at);
    const dateLabel = start.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    });
    const timeLabel = `${start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "UTC" })} – ${end.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "UTC" })}`;
    const priceLabel = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: service.currency || "USD",
    }).format((service.price_cents || 0) / 100);

    const { buildConfirmationSms } = await import("@/lib/sms/twilio.server");
    const { logAndSendSms } = await import("@/lib/sms/log-and-send.server");
    await logAndSendSms({
      to: customer.phone,
      workspaceId: appt.workspace_id,
      purpose: "confirmation_resend",
      body: buildConfirmationSms({
        businessName: workspace.name,
        firstName: customer.full_name?.split(" ")[0],
        serviceName: service.name,
        dateLabel,
        timeLabel,
        priceLabel,
        businessAddress: workspace.business_address ?? undefined,
        businessPhone: workspace.business_phone ?? undefined,
        businessEmail: workspace.business_email ?? undefined,
        businessWebsite: workspace.business_website ?? undefined,
      }),
    });

    await supabaseAdmin.from("admin_audit_log").insert({
      actor_id: context.userId,
      action: "resend_confirmation_sms",
      target_workspace_id: appt.workspace_id,
      detail: { appointment_id: appt.id },
    });
    return { ok: true };
  });

export const triggerAppointmentWebhook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ appointmentId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertPlatformAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: appt } = await supabaseAdmin
      .from("appointments")
      .select("*")
      .eq("id", data.appointmentId)
      .maybeSingle();
    if (!appt) throw new Error("Appointment not found.");

    const secret = process.env.APPOINTMENT_WEBHOOK_SECRET;
    if (!secret) throw new Error("Webhook secret not configured.");

    const res = await fetch(`${PROJECT_URL}/api/public/appointment-confirmation`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-webhook-secret": secret },
      body: JSON.stringify({
        type: "INSERT",
        table: "appointments",
        schema: "public",
        record: appt,
        old_record: null,
      }),
    });
    const text = await res.text();

    await supabaseAdmin.from("admin_audit_log").insert({
      actor_id: context.userId,
      action: "trigger_appointment_webhook",
      target_workspace_id: appt.workspace_id,
      detail: { appointment_id: appt.id, status: res.status },
    });
    return { ok: res.ok, status: res.status, response: text.slice(0, 500) };
  });

export const pokeEmailQueue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertPlatformAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Re-run the cron dispatcher, which processes any queued emails.
    const { error } = await supabaseAdmin.rpc("email_queue_dispatch");
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("admin_audit_log").insert({
      actor_id: context.userId,
      action: "poke_email_queue",
    });
    return { ok: true };
  });

// ---- System health ---------------------------------------------------------

export const getSystemHealth = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertPlatformAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [statsRes, cronRes, subsRes, emailRes, smsRes] = await Promise.all([
      supabaseAdmin.rpc("admin_platform_stats"),
      supabaseAdmin.rpc("admin_cron_status"),
      supabaseAdmin
        .from("subscriptions")
        .select("workspace_id, plan_tier, status, environment, current_period_end")
        .in("status", ["past_due", "unpaid", "incomplete", "incomplete_expired"]),
      supabaseAdmin
        .from("email_send_log")
        .select("id, template_name, recipient_email, status, error_message, created_at")
        .in("status", ["failed", "dlq", "bounced", "complained"])
        .order("created_at", { ascending: false })
        .limit(25),
      supabaseAdmin
        .from("sms_send_log")
        .select("id, to_number, purpose, status, error_message, created_at")
        .eq("status", "failed")
        .order("created_at", { ascending: false })
        .limit(25),
    ]);

    // Live Stripe: recent failed charges (best-effort, per available env key).
    let stripeFailedCharges: any[] = [];
    let stripeError: string | null = null;
    try {
      const { stripeFetch } = await import("@/lib/stripe.server");
      const envs: ("live" | "sandbox")[] = [];
      if (process.env.STRIPE_LIVE_API_KEY) envs.push("live");
      if (process.env.STRIPE_SANDBOX_API_KEY) envs.push("sandbox");
      for (const env of envs) {
        try {
          const charges = await stripeFetch<{ data: any[] }>(env, "/charges", {
            method: "GET",
            params: { limit: 20 },
          });
          for (const c of charges.data ?? []) {
            if (c.status === "failed" || (c.refunded && c.amount_refunded > 0)) {
              stripeFailedCharges.push({
                id: c.id,
                env,
                amount: c.amount / 100,
                currency: c.currency,
                status: c.status,
                failure_message: c.failure_message ?? null,
                created: new Date(c.created * 1000).toISOString(),
              });
            }
          }
        } catch (e) {
          stripeError = e instanceof Error ? e.message : String(e);
        }
      }
    } catch (e) {
      stripeError = e instanceof Error ? e.message : String(e);
    }

    // Live Twilio: recent messages with failed/undelivered status.
    let twilioFailed: any[] = [];
    let twilioError: string | null = null;
    try {
      const sid = process.env.TWILIO_ACCOUNT_SID;
      const token = process.env.TWILIO_AUTH_TOKEN;
      if (sid && token) {
        const auth = Buffer.from(`${sid}:${token}`).toString("base64");
        const res = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json?PageSize=50`,
          { headers: { Authorization: `Basic ${auth}` } },
        );
        if (res.ok) {
          const body = (await res.json()) as { messages?: any[] };
          twilioFailed = (body.messages ?? [])
            .filter((m) => m.status === "failed" || m.status === "undelivered")
            .map((m) => ({
              sid: m.sid,
              to: m.to,
              status: m.status,
              error_code: m.error_code,
              date_sent: m.date_sent,
            }));
        } else {
          twilioError = `Twilio API ${res.status}`;
        }
      }
    } catch (e) {
      twilioError = e instanceof Error ? e.message : String(e);
    }

    return {
      stats: statsRes.data ?? null,
      cron: cronRes.data ?? [],
      stripe: { failedCharges: stripeFailedCharges, pastDueSubscriptions: subsRes.data ?? [], error: stripeError },
      twilio: { failed: twilioFailed, recentFailedLogs: smsRes.data ?? [], error: twilioError },
      email: { recentFailures: emailRes.data ?? [] },
    };
  });
