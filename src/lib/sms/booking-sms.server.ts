import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  buildBookingRequestSms,
  buildOwnerAlertSms,
} from "./twilio.server";
import { logAndSendSms } from "./log-and-send.server";

// Hydrates a freshly created (pending) appointment and sends:
//  - the client a "thank you for booking" SMS with appointment details +
//    business address, asking them to reply YES/NO.
//  - the tenant/owner a new-booking alert SMS.
// Server-only. Best-effort: never throws so booking creation is never blocked.
export async function sendBookingSms(appointmentId: string): Promise<void> {
  const { data: appt } = await supabaseAdmin
    .from("appointments")
    .select("id, workspace_id, service_id, customer_id, start_at, end_at, notes")
    .eq("id", appointmentId)
    .maybeSingle();
  if (!appt) return;

  const [customerRes, workspaceRes, serviceRes] = await Promise.all([
    supabaseAdmin
      .from("customers")
      .select("full_name, phone")
      .eq("id", appt.customer_id)
      .maybeSingle(),
    supabaseAdmin
      .from("workspaces")
      .select("name, business_address, business_phone, notify_mobile")
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
  if (!customer || !workspace || !service) return;

  const tz = "UTC";
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
  const firstName = customer.full_name?.split(" ")[0] ?? "there";

  // Add-ons are appended to the appointment notes as "Add-ons: ..." by the
  // booking flow; extract them for display.
  let addOns = "";
  const match = /Add-ons:\s*(.+)/i.exec(appt.notes ?? "");
  if (match) addOns = match[1].trim();

  const tasks: Promise<unknown>[] = [];

  // Client "thank you for booking" + confirmation request.
  if (customer.phone) {
    tasks.push(
      (async () => {
        try {
          await logAndSendSms({
            to: customer.phone!,
            workspaceId: appt.workspace_id,
            purpose: "booking_request",
            body: buildBookingRequestSms({
              businessName: workspace.name,
              firstName,
              serviceName: service.name,
              dateLabel,
              timeLabel,
              priceLabel,
              addOns,
              businessAddress: workspace.business_address ?? "",
              // Short per-appointment token so YES/NO replies map to THIS booking.
              confirmCode: appt.id.replace(/-/g, "").slice(0, 6).toUpperCase(),
            }),
          });
        } catch (err) {
          console.error("[booking-sms] client SMS failed", err);
        }
      })(),
    );
  }

  // Tenant/owner alert — business phone first, else the owner notify mobile.
  const ownerNumber = workspace.business_phone || workspace.notify_mobile;
  if (ownerNumber) {
    tasks.push(
      (async () => {
        try {
          await logAndSendSms({
            to: ownerNumber!,
            workspaceId: appt.workspace_id,
            purpose: "owner_alert",
            body: buildOwnerAlertSms({
              businessName: workspace.name,
              customerName: customer.full_name ?? "",
              customerPhone: customer.phone ?? "",
              serviceName: service.name,
              dateLabel,
              timeLabel,
            }),
          });
        } catch (err) {
          console.error("[booking-sms] owner SMS failed", err);
        }
      })(),
    );
  }

  await Promise.allSettled(tasks);
}
