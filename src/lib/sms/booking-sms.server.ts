/**
 * Booking SMS orchestration.
 *
 * Fires after a booking is created (request/YES-NO flow) and after a booking
 * is confirmed by payment (deposit flows). Sends:
 *   1) a client text to the customer (request with YES/NO code, or a plain
 *      confirmation once paid), and
 *   2) an alert to the business owner's mobile (workspaces.notify_mobile,
 *      falling back to business_phone).
 *
 * Booking SMS is a Pro/Enterprise feature — gated via the
 * `sms_booking_confirmations` flag in workspace_has_feature. Skipped sends
 * (plan gate or the tenant's client_sms toggle) are written to sms_send_log
 * with status "skipped" so they are visible in the admin console.
 *
 * Never throws: SMS delivery must not break the booking flow.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { logAndSendSms } from "@/lib/sms/log-and-send.server";
import {
  buildBookingRequestSms,
  buildConfirmationSms,
  buildOwnerAlertSms,
  formatDateLabel,
  formatTimeLabel,
  type BookingSmsDetails,
} from "@/lib/sms/twilio.server";

type WorkspaceSmsContext = {
  workspaceName: string;
  ownerPhone: string | null;
  timezone: string;
  clientSmsEnabled: boolean;
};

async function loadWorkspaceContext(workspaceId: string): Promise<WorkspaceSmsContext | null> {
  const [{ data: ws }, { data: notif }] = await Promise.all([
    supabaseAdmin
      .from("workspaces")
      .select("name, notify_mobile, business_phone, timezone")
      .eq("id", workspaceId)
      .maybeSingle(),
    supabaseAdmin
      .from("notification_settings")
      .select("client_sms")
      .eq("workspace_id", workspaceId)
      .maybeSingle(),
  ]);
  if (!ws) return null;
  type Row = { name?: string; notify_mobile?: string | null; business_phone?: string | null; timezone?: string };
  const row = ws as Row;
  return {
    workspaceName: row.name ?? "your business",
    ownerPhone: row.notify_mobile ?? row.business_phone ?? null,
    timezone: row.timezone ?? "UTC",
    clientSmsEnabled: (notif as { client_sms?: boolean } | null)?.client_sms !== false,
  };
}

/** Pro/Enterprise gate for booking SMS. Fails closed (no SMS) on error. */
async function isSmsEligible(workspaceId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin.rpc("workspace_has_feature", {
    _workspace_id: workspaceId,
    _feature: "sms_booking_confirmations",
    _env: "live",
  });
  if (error) {
    console.warn("[booking-sms] feature check failed", error.message ?? error);
    return false;
  }
  return data === true;
}

async function logSkipped(
  workspaceId: string,
  toNumber: string | null,
  body: string,
  purpose: string,
  reason: string,
): Promise<void> {
  try {
    await supabaseAdmin.from("sms_send_log").insert({
      workspace_id: workspaceId,
      to_number: toNumber,
      body,
      purpose,
      status: "skipped",
      error_message: reason,
    });
  } catch (e) {
    console.warn("[booking-sms] skip log insert failed", e);
  }
}

async function loadBookingDetails(appointmentId: string): Promise<BookingSmsDetails | null> {
  const { data: appt } = await supabaseAdmin
    .from("appointments")
    .select("id, workspace_id, service_id, start_at, customers(full_name, phone, email), services(name, price_cents, currency)")
    .eq("id", appointmentId)
    .maybeSingle();
  if (!appt) return null;

  type ApptRow = {
    workspace_id: string;
    start_at: string;
    customers?: { full_name?: string | null; phone?: string | null; email?: string | null } | null;
    services?: { name?: string | null; price_cents?: number | null; currency?: string | null } | null;
  };
  const row = appt as unknown as ApptRow;

  const { data: ws } = await supabaseAdmin
    .from("workspaces")
    .select("name, business_address")
    .eq("id", row.workspace_id)
    .maybeSingle();
  type WsRow = { name?: string; business_address?: string | null };
  const wsRow = (ws ?? {}) as WsRow;

  const priceCents = row.services?.price_cents ?? null;
  const currency = (row.services?.currency ?? "USD").toUpperCase();
  const priceLabel =
    priceCents != null
      ? new Intl.NumberFormat("en-US", { style: "currency", currency }).format(priceCents / 100)
      : null;

  return {
    appointmentId,
    workspaceId: row.workspace_id,
    businessName: wsRow.name ?? "your business",
    customerName: row.customers?.full_name ?? "Customer",
    customerPhone: row.customers?.phone ?? null,
    customerEmail: row.customers?.email ?? null,
    serviceName: row.services?.name ?? "Appointment",
    startAt: row.start_at,
    priceLabel,
    businessAddress: wsRow.business_address ?? null,
    // Short per-appointment code used by the YES/NO inbound webhook to scope
    // the reply to THIS booking.
    confirmCode: appointmentId.replace(/-/g, "").slice(0, 6).toUpperCase(),
  };
}

/**
 * Sends the booking-request texts (client YES/NO + owner alert) after a free
 * booking is created. Best-effort, never throws.
 */
export async function sendBookingSms(appointmentId: string): Promise<void> {
  try {
    const details = await loadBookingDetails(appointmentId);
    if (!details) {
      console.warn("[booking-sms] appointment not found", appointmentId);
      return;
    }
    const ctx = await loadWorkspaceContext(details.workspaceId);
    if (!ctx) {
      console.warn("[booking-sms] workspace not found", details.workspaceId);
      return;
    }

    const dateLabel = formatDateLabel(details.startAt, ctx.timezone);
    const timeLabel = formatTimeLabel(details.startAt, ctx.timezone);

    if (!(await isSmsEligible(details.workspaceId))) {
      await logSkipped(
        details.workspaceId,
        details.customerPhone,
        buildBookingRequestSms(details),
        "client_confirm",
        "plan_not_eligible",
      );
      await logSkipped(
        details.workspaceId,
        ctx.ownerPhone,
        buildOwnerAlertSms({
          businessName: ctx.workspaceName,
          customerName: details.customerName,
          customerPhone: details.customerPhone ?? undefined,
          serviceName: details.serviceName,
          dateLabel,
          timeLabel,
        }),
        "owner_alert",
        "plan_not_eligible",
      );
      return;
    }

    if (details.customerPhone) {
      if (ctx.clientSmsEnabled) {
        await logAndSendSms({
          workspaceId: details.workspaceId,
          toNumber: details.customerPhone,
          body: buildBookingRequestSms(details),
          purpose: "client_confirm",
        });
      } else {
        await logSkipped(
          details.workspaceId,
          details.customerPhone,
          buildBookingRequestSms(details),
          "client_confirm",
          "client_sms_disabled",
        );
      }
    }

    if (ctx.ownerPhone) {
      await logAndSendSms({
        workspaceId: details.workspaceId,
        toNumber: ctx.ownerPhone,
        body: buildOwnerAlertSms({
          businessName: ctx.workspaceName,
          customerName: details.customerName,
          customerPhone: details.customerPhone ?? undefined,
          serviceName: details.serviceName,
          dateLabel,
          timeLabel,
        }),
        purpose: "owner_alert",
      });
    }
  } catch (e) {
    console.warn("[booking-sms] orchestration failed", e);
  }
}

/**
 * Sends the "booking confirmed" texts after a deposit payment confirms the
 * appointment (Stripe or Square deposit flows). Client gets a plain
 * confirmation (no YES/NO — payment already confirmed); owner gets a
 * confirmed alert. Best-effort, never throws.
 */
export async function sendBookingConfirmedSms(appointmentId: string): Promise<void> {
  try {
    const details = await loadBookingDetails(appointmentId);
    if (!details) {
      console.warn("[booking-sms] appointment not found", appointmentId);
      return;
    }
    const ctx = await loadWorkspaceContext(details.workspaceId);
    if (!ctx) {
      console.warn("[booking-sms] workspace not found", details.workspaceId);
      return;
    }

    const dateLabel = formatDateLabel(details.startAt, ctx.timezone);
    const timeLabel = formatTimeLabel(details.startAt, ctx.timezone);
    const ownerBody = buildOwnerAlertSms(
      {
        businessName: ctx.workspaceName,
        customerName: details.customerName,
        customerPhone: details.customerPhone ?? undefined,
        serviceName: details.serviceName,
        dateLabel,
        timeLabel,
      },
      { confirmed: true },
    );

    if (!(await isSmsEligible(details.workspaceId))) {
      await logSkipped(
        details.workspaceId,
        details.customerPhone,
        buildConfirmationSms(details),
        "client_confirmed",
        "plan_not_eligible",
      );
      await logSkipped(details.workspaceId, ctx.ownerPhone, ownerBody, "owner_alert", "plan_not_eligible");
      return;
    }

    if (details.customerPhone) {
      if (ctx.clientSmsEnabled) {
        await logAndSendSms({
          workspaceId: details.workspaceId,
          toNumber: details.customerPhone,
          body: buildConfirmationSms(details),
          purpose: "client_confirmed",
        });
      } else {
        await logSkipped(
          details.workspaceId,
          details.customerPhone,
          buildConfirmationSms(details),
          "client_confirmed",
          "client_sms_disabled",
        );
      }
    }

    if (ctx.ownerPhone) {
      await logAndSendSms({
        workspaceId: details.workspaceId,
        toNumber: ctx.ownerPhone,
        body: ownerBody,
        purpose: "owner_alert",
      });
    }
  } catch (e) {
    console.warn("[booking-sms] confirmed orchestration failed", e);
  }
}
