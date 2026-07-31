/**
 * Booking SMS orchestration.
 *
 * Two flows:
 *  - sendBookingSms: fires after a free booking is created. Client gets a
 *    "thank you for booking" text with a YES/NO confirmation code; the owner
 *    gets a new-booking alert.
 *  - sendBookingConfirmedSms: fires when a booking becomes confirmed (deposit
 *    payment, dashboard-created booking, etc.). Client gets a plain
 *    confirmation text (no YES/NO — payment already confirmed); the owner
 *    gets a confirmed alert.
 *
 * Booking SMS is a Pro/Enterprise feature — gated via the
 * `sms_booking_confirmations` flag in workspace_has_feature. The tenant's
 * `client_sms` preference (workspaces.notification_settings jsonb) can disable
 * the client text. Skipped sends are written to sms_send_log with status
 * "skipped" so they are visible in the admin console.
 *
 * Server-only. Best-effort: never throws so booking/payment flows never break.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  buildBookingRequestSms,
  buildConfirmationSms,
  buildOwnerAlertSms,
} from "./twilio.server";
import { logAndSendSms } from "./log-and-send.server";

type BookingContext = {
  appointmentId: string;
  workspaceId: string;
  workspaceName: string;
  ownerPhone: string | null;
  clientSmsEnabled: boolean;
  customerName: string;
  firstName: string;
  customerPhone: string | null;
  serviceName: string;
  dateLabel: string;
  timeLabel: string;
  priceLabel: string;
  addOns: string;
  businessAddress: string;
  businessPhone: string;
  businessEmail: string;
  businessWebsite: string;
  confirmCode: string;
};

async function loadBookingContext(appointmentId: string): Promise<BookingContext | null> {
  const { data: appt } = await supabaseAdmin
    .from("appointments")
    .select("id, workspace_id, service_id, customer_id, start_at, end_at, notes")
    .eq("id", appointmentId)
    .maybeSingle();
  if (!appt) return null;

  const [customerRes, workspaceRes, serviceRes] = await Promise.all([
    supabaseAdmin
      .from("customers")
      .select("full_name, phone")
      .eq("id", appt.customer_id)
      .maybeSingle(),
    supabaseAdmin
      .from("workspaces")
      .select(
        "name, business_address, business_phone, business_email, business_website, notify_mobile, timezone, notification_settings",
      )
      .eq("id", appt.workspace_id)
      .maybeSingle(),
    supabaseAdmin
      .from("services")
      .select("name, price_cents, currency")
      .eq("id", appt.service_id)
      .maybeSingle(),
  ]);

  const customer = customerRes.data;
  const workspace = workspaceRes.data;
  const service = serviceRes.data;
  if (!customer || !workspace || !service) return null;

  const prefs = (workspace.notification_settings as Record<string, boolean> | null) ?? {};
  const tz = workspace.timezone || "UTC";
  const start = new Date(appt.start_at);
  const end = new Date(appt.end_at);
  const dateLabel = start.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: tz,
  });
  const timeLabel = `${start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: tz })} – ${end.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: tz })}`;
  const priceLabel = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: service.currency || "USD",
  }).format((service.price_cents || 0) / 100);

  // Add-ons are appended to the appointment notes as "Add-ons: ..." by the
  // booking flow; extract them for display.
  let addOns = "";
  const match = /Add-ons:\s*(.+)/i.exec(appt.notes ?? "");
  if (match) addOns = match[1].trim();

  return {
    appointmentId,
    workspaceId: appt.workspace_id,
    workspaceName: workspace.name,
    // Owner alert target: dedicated notify mobile first, else business phone.
    ownerPhone: workspace.notify_mobile || workspace.business_phone || null,
    clientSmsEnabled: prefs.client_sms === true,
    customerName: customer.full_name ?? "Customer",
    firstName: customer.full_name?.split(" ")[0] ?? "there",
    customerPhone: customer.phone ?? null,
    serviceName: service.name,
    dateLabel,
    timeLabel,
    priceLabel,
    addOns,
    businessAddress: workspace.business_address ?? "",
    businessPhone: workspace.business_phone ?? "",
    businessEmail: workspace.business_email ?? "",
    businessWebsite: workspace.business_website ?? "",
    // Short per-appointment code used by the YES/NO inbound webhook to scope
    // the reply to THIS booking.
    confirmCode: appointmentId.replace(/-/g, "").slice(0, 6).toUpperCase(),
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
  to: string | null,
  body: string,
  purpose: string,
  reason: string,
): Promise<void> {
  try {
    await supabaseAdmin.from("sms_send_log").insert({
      workspace_id: workspaceId,
      to_number: to,
      body,
      purpose,
      status: "skipped",
      error_message: reason,
    });
  } catch (e) {
    console.warn("[booking-sms] skip log insert failed", e);
  }
}

function requestSmsBody(ctx: BookingContext): string {
  return buildBookingRequestSms({
    businessName: ctx.workspaceName,
    firstName: ctx.firstName,
    serviceName: ctx.serviceName,
    dateLabel: ctx.dateLabel,
    timeLabel: ctx.timeLabel,
    priceLabel: ctx.priceLabel,
    addOns: ctx.addOns,
    businessAddress: ctx.businessAddress,
    confirmCode: ctx.confirmCode,
  });
}

function confirmationSmsBody(ctx: BookingContext): string {
  return buildConfirmationSms({
    businessName: ctx.workspaceName,
    firstName: ctx.firstName,
    serviceName: ctx.serviceName,
    dateLabel: ctx.dateLabel,
    timeLabel: ctx.timeLabel,
    priceLabel: ctx.priceLabel,
    addOns: ctx.addOns,
    businessAddress: ctx.businessAddress,
    businessPhone: ctx.businessPhone,
    businessEmail: ctx.businessEmail,
    businessWebsite: ctx.businessWebsite,
  });
}

function ownerAlertBody(ctx: BookingContext, confirmed: boolean): string {
  return buildOwnerAlertSms(
    {
      businessName: ctx.workspaceName,
      customerName: ctx.customerName,
      customerPhone: ctx.customerPhone ?? "",
      serviceName: ctx.serviceName,
      dateLabel: ctx.dateLabel,
      timeLabel: ctx.timeLabel,
    },
    { confirmed },
  );
}

/** Shared client-text send honoring the tenant's client_sms toggle. */
async function sendClientText(
  ctx: BookingContext,
  body: string,
  purpose: string,
): Promise<void> {
  if (!ctx.customerPhone) return;
  if (!ctx.clientSmsEnabled) {
    await logSkipped(ctx.workspaceId, ctx.customerPhone, body, purpose, "client_sms_disabled");
    return;
  }
  try {
    await logAndSendSms({
      to: ctx.customerPhone,
      workspaceId: ctx.workspaceId,
      purpose,
      body,
    });
  } catch (err) {
    console.error("[booking-sms] client SMS failed", err);
  }
}

async function sendOwnerAlert(ctx: BookingContext, confirmed: boolean): Promise<void> {
  if (!ctx.ownerPhone) return;
  try {
    await logAndSendSms({
      to: ctx.ownerPhone,
      workspaceId: ctx.workspaceId,
      purpose: "owner_alert",
      body: ownerAlertBody(ctx, confirmed),
    });
  } catch (err) {
    console.error("[booking-sms] owner SMS failed", err);
  }
}

/**
 * Free-booking flow: client "thank you for booking" + YES/NO request, owner
 * "awaiting client confirmation" alert. Called by createBooking.
 */
export async function sendBookingSms(appointmentId: string): Promise<void> {
  try {
    const ctx = await loadBookingContext(appointmentId);
    if (!ctx) {
      console.warn("[booking-sms] booking context unavailable", appointmentId);
      return;
    }

    if (!(await isSmsEligible(ctx.workspaceId))) {
      await logSkipped(ctx.workspaceId, ctx.customerPhone, requestSmsBody(ctx), "booking_request", "plan_not_eligible");
      await logSkipped(ctx.workspaceId, ctx.ownerPhone, ownerAlertBody(ctx, false), "owner_alert", "plan_not_eligible");
      return;
    }

    await sendClientText(ctx, requestSmsBody(ctx), "booking_request");
    await sendOwnerAlert(ctx, false);
  } catch (e) {
    console.warn("[booking-sms] request orchestration failed", e);
  }
}

/**
 * Confirmed-booking flow: client plain confirmation text (no YES/NO — the
 * booking is already confirmed) + owner "confirmed" alert. Called by the
 * Stripe/Square deposit confirmation paths and the appointment webhook for
 * bookings inserted already-confirmed.
 */
export async function sendBookingConfirmedSms(appointmentId: string): Promise<void> {
  try {
    const ctx = await loadBookingContext(appointmentId);
    if (!ctx) {
      console.warn("[booking-sms] booking context unavailable", appointmentId);
      return;
    }

    if (!(await isSmsEligible(ctx.workspaceId))) {
      await logSkipped(ctx.workspaceId, ctx.customerPhone, confirmationSmsBody(ctx), "client_confirmed", "plan_not_eligible");
      await logSkipped(ctx.workspaceId, ctx.ownerPhone, ownerAlertBody(ctx, true), "owner_alert", "plan_not_eligible");
      return;
    }

    await sendClientText(ctx, confirmationSmsBody(ctx), "client_confirmed");
    await sendOwnerAlert(ctx, true);
  } catch (e) {
    console.warn("[booking-sms] confirmed orchestration failed", e);
  }
}
