import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { enqueueTransactionalEmail } from "./dispatch.server";

// Hydrates an appointment and enqueues the customer confirmation + owner alert
// through Lovable's queued email system. Server-only. Safe to call from the
// appointment webhook route and from booking server functions.

export async function sendAppointmentEmails(appointmentId: string): Promise<void> {
  const { data: appt } = await supabaseAdmin
    .from("appointments")
    .select("id, workspace_id, service_id, customer_id, provider_id, start_at, end_at, status, notes")
    .eq("id", appointmentId)
    .maybeSingle();
  if (!appt || appt.status === "cancelled" || appt.status === "pending") return;

  const [customerRes, workspaceRes, serviceRes] = await Promise.all([
    supabaseAdmin.from("customers").select("full_name, email, phone").eq("id", appt.customer_id).maybeSingle(),
    supabaseAdmin
      .from("workspaces")
      .select("name, slug, owner_id, theme_config, notification_settings, business_address, business_phone, business_email, business_website")
      .eq("id", appt.workspace_id)
      .maybeSingle(),
    supabaseAdmin
      .from("services")
      .select("name, duration_minutes, price_cents, currency")
      .eq("id", appt.service_id)
      .maybeSingle(),
  ]);

  const customer = customerRes.data;
  const workspace = workspaceRes.data;
  const service = serviceRes.data;
  if (!customer || !workspace || !service) return;

  const { data: ownerProfile } = await supabaseAdmin
    .from("profiles")
    .select("email, full_name")
    .eq("id", workspace.owner_id)
    .maybeSingle();

  const prefs = {
    client_email: true,
    client_sms: false,
    provider_email: true,
    ...((workspace.notification_settings as Record<string, boolean>) ?? {}),
  };

  const theme = (workspace.theme_config as Record<string, string>) ?? {};
  const primary = theme.primary_color || "#4f46e5";

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
  let cleanNotes = appt.notes ?? "";
  const match = /Add-ons:\s*(.+)/i.exec(cleanNotes);
  if (match) {
    addOns = match[1].trim();
    cleanNotes = cleanNotes.replace(match[0], "").trim();
  }

  const tasks: Promise<unknown>[] = [];

  if (prefs.client_email && customer.email) {
    tasks.push(
      enqueueTransactionalEmail({
        templateName: "booking-confirmation",
        recipientEmail: customer.email,
        idempotencyKey: `booking-confirm-${appt.id}`,
        templateData: {
          businessName: workspace.name,
          firstName,
          serviceName: service.name,
          dateLabel,
          timeLabel,
          priceLabel,
          addOns,
          notes: cleanNotes,
          primary,
          businessAddress: workspace.business_address ?? "",
          businessPhone: workspace.business_phone ?? "",
          businessEmail: workspace.business_email ?? "",
          businessWebsite: workspace.business_website ?? "",
        },
      }),
    );
  }

  if (prefs.provider_email && ownerProfile?.email) {
    tasks.push(
      enqueueTransactionalEmail({
        templateName: "booking-alert",
        recipientEmail: ownerProfile.email,
        idempotencyKey: `booking-alert-${appt.id}`,
        templateData: {
          ownerName: ownerProfile.full_name ?? "there",
          customerName: customer.full_name,
          customerEmail: customer.email ?? "",
          customerPhone: customer.phone ?? "",
          serviceName: service.name,
          dateLabel,
          timeLabel,
          priceLabel,
          addOns,
          primary,
        },
      }),
    );
  }

  if (prefs.client_sms && customer.phone) {
    tasks.push(
      (async () => {
        try {
          const { sendSms } = await import("@/lib/sms/twilio.server");
          const changeContact = workspace.business_phone
            ? ` Call ${workspace.business_phone} to make changes.`
            : "";
          await sendSms({
            to: customer.phone!,
            body: `${workspace.name}: Your ${service.name} is confirmed for ${dateLabel} at ${timeLabel}.${changeContact}`,
          });
        } catch (err) {
          console.error("[appointment-emails] SMS send failed", err);
        }
      })(),
    );
  }

  await Promise.allSettled(tasks);
}
