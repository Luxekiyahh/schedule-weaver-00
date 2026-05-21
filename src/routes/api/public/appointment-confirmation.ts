import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Public webhook endpoint invoked by a Supabase database webhook on
// INSERT into public.appointments. Authenticates the caller via a shared
// secret header (APPOINTMENT_WEBHOOK_SECRET) configured on the webhook.
//
// Stable URL for the webhook target:
//   https://project--b242ffaf-aba9-404d-ae2f-439da5daa84a.lovable.app/api/public/appointment-confirmation
//
// Configure the webhook to send header:
//   x-webhook-secret: <APPOINTMENT_WEBHOOK_SECRET value>

type AppointmentRecord = {
  id: string;
  workspace_id: string;
  service_id: string;
  customer_id: string;
  provider_id: string;
  start_at: string;
  end_at: string;
  status: string;
  notes: string | null;
};

type WebhookPayload = {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  schema: string;
  record: AppointmentRecord;
  old_record: AppointmentRecord | null;
};

export const Route = createFileRoute("/api/public/appointment-confirmation")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // 1. Authenticate
        const secret = request.headers.get("x-webhook-secret");
        if (!secret || secret !== process.env.APPOINTMENT_WEBHOOK_SECRET) {
          return new Response("Unauthorized", { status: 401 });
        }

        // 2. Parse payload (best-effort: respond 200 on bad payload so the
        //    webhook isn't retried for malformed events).
        let payload: WebhookPayload;
        try {
          payload = (await request.json()) as WebhookPayload;
        } catch {
          return Response.json({ ok: false, error: "invalid_json" }, { status: 200 });
        }

        if (payload.type !== "INSERT" || payload.table !== "appointments" || !payload.record) {
          return Response.json({ ok: true, skipped: "not_insert" });
        }

        const appt = payload.record;
        if (appt.status === "cancelled") {
          return Response.json({ ok: true, skipped: "cancelled" });
        }

        try {
          // 3. Hydrate related data using the admin client (bypasses RLS).
          const [customerRes, workspaceRes, serviceRes, providerRes] = await Promise.all([
            supabaseAdmin.from("customers").select("full_name, email, phone").eq("id", appt.customer_id).maybeSingle(),
            supabaseAdmin.from("workspaces").select("name, slug, owner_id, theme_config, notification_settings").eq("id", appt.workspace_id).maybeSingle(),
            supabaseAdmin.from("services").select("name, duration_minutes, price_cents, currency").eq("id", appt.service_id).maybeSingle(),
            supabaseAdmin.from("workspace_members").select("user_id").eq("id", appt.provider_id).maybeSingle(),
          ]);

          const customer = customerRes.data;
          const workspace = workspaceRes.data;
          const service = serviceRes.data;
          if (!customer || !workspace || !service) {
            return Response.json({ ok: false, error: "missing_relations" });
          }

          // Fetch owner profile (email) for provider alert
          const { data: ownerProfile } = await supabaseAdmin
            .from("profiles")
            .select("email, full_name")
            .eq("id", workspace.owner_id)
            .maybeSingle();

          // Notification preferences (with safe defaults)
          const prefs = {
            client_email: true,
            client_sms: false,
            provider_email: true,
            ...((workspace.notification_settings as Record<string, boolean>) ?? {}),
          };

          // Branding
          const theme = (workspace.theme_config as Record<string, string>) ?? {};
          const primary = theme.primary_color || "#4f46e5";

          // Formatting helpers
          const tz = "UTC";
          const start = new Date(appt.start_at);
          const end = new Date(appt.end_at);
          const dateLabel = start.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: tz });
          const timeLabel = `${start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: tz })} – ${end.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: tz })}`;
          const priceLabel = new Intl.NumberFormat("en-US", { style: "currency", currency: service.currency || "USD" }).format((service.price_cents || 0) / 100);
          const firstName = customer.full_name?.split(" ")[0] ?? "there";

          const dispatched: Record<string, unknown> = {};

          // 4. Email — client confirmation
          if (prefs.client_email && customer.email) {
            dispatched.client_email = await sendResendEmail({
              from: `${workspace.name} <onboarding@resend.dev>`,
              to: customer.email,
              subject: `Your appointment at ${workspace.name} is confirmed!`,
              html: clientEmailHtml({
                businessName: workspace.name,
                firstName,
                serviceName: service.name,
                dateLabel,
                timeLabel,
                durationMinutes: service.duration_minutes,
                priceLabel,
                primary,
                notes: appt.notes,
              }),
            });
          }

          // 5. Email — provider alert
          if (prefs.provider_email && ownerProfile?.email) {
            dispatched.provider_email = await sendResendEmail({
              from: `Booking Alerts <onboarding@resend.dev>`,
              to: ownerProfile.email,
              subject: `New booking: ${customer.full_name} — ${service.name}`,
              html: providerEmailHtml({
                ownerName: ownerProfile.full_name ?? "there",
                customerName: customer.full_name,
                customerEmail: customer.email ?? "",
                customerPhone: customer.phone ?? "",
                serviceName: service.name,
                dateLabel,
                timeLabel,
                priceLabel,
                primary,
              }),
            });
          }

          // 6. SMS — client confirmation (Twilio)
          if (prefs.client_sms && customer.phone) {
            const shortDate = start.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: tz });
            const shortTime = start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: tz });
            const body = `Hi ${firstName}, your appointment for ${service.name} at ${workspace.name} is confirmed for ${shortDate} at ${shortTime}. See you soon!`;
            dispatched.client_sms = await sendTwilioSms({ to: customer.phone, body: body.slice(0, 320) });
          }

          return Response.json({ ok: true, dispatched });
        } catch (err) {
          console.error("[appointment-confirmation] failed", err);
          // Return 200 so the webhook doesn't endlessly retry on a logic bug.
          return Response.json({ ok: false, error: String(err) }, { status: 200 });
        }
      },
    },
  },
});

// ---------- Resend ----------
async function sendResendEmail(input: { from: string; to: string; subject: string; html: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { skipped: "no_resend_key" };
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: input.from, to: [input.to], subject: input.subject, html: input.html }),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, body: json };
}

// ---------- Twilio ----------
async function sendTwilioSms(input: { to: string; body: string }) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;
  if (!sid || !token || !from) return { skipped: "no_twilio_credentials" };
  const auth = btoa(`${sid}:${token}`);
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ To: input.to, From: from, Body: input.body }),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, body: json };
}

// ---------- Email templates ----------
function clientEmailHtml(p: {
  businessName: string; firstName: string; serviceName: string;
  dateLabel: string; timeLabel: string; durationMinutes: number;
  priceLabel: string; primary: string; notes: string | null;
}) {
  return `<!doctype html><html><body style="margin:0;background:#f6f7fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 2px rgba(15,23,42,.06);">
        <tr><td style="padding:28px 32px;background:${p.primary};color:#ffffff;">
          <div style="font-size:13px;opacity:.85;letter-spacing:.08em;text-transform:uppercase;">Appointment confirmed</div>
          <div style="font-size:22px;font-weight:600;margin-top:6px;">${escapeHtml(p.businessName)}</div>
        </td></tr>
        <tr><td style="padding:28px 32px;">
          <p style="margin:0 0 14px;font-size:16px;">Hi ${escapeHtml(p.firstName)},</p>
          <p style="margin:0 0 20px;font-size:15px;line-height:1.55;color:#334155;">Your appointment at <strong>${escapeHtml(p.businessName)}</strong> is confirmed. We've added it to the calendar — here are the details:</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
            <tr><td style="padding:14px 18px;border-bottom:1px solid #e2e8f0;"><div style="font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:.06em;">Service</div><div style="font-size:15px;font-weight:600;margin-top:2px;">${escapeHtml(p.serviceName)} · ${p.durationMinutes} min · ${escapeHtml(p.priceLabel)}</div></td></tr>
            <tr><td style="padding:14px 18px;border-bottom:1px solid #e2e8f0;"><div style="font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:.06em;">Date</div><div style="font-size:15px;font-weight:600;margin-top:2px;">${escapeHtml(p.dateLabel)}</div></td></tr>
            <tr><td style="padding:14px 18px;"><div style="font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:.06em;">Time</div><div style="font-size:15px;font-weight:600;margin-top:2px;">${escapeHtml(p.timeLabel)}</div></td></tr>
          </table>
          ${p.notes ? `<p style="margin:18px 0 0;font-size:14px;color:#475569;"><strong>Notes:</strong> ${escapeHtml(p.notes)}</p>` : ""}
          <p style="margin:24px 0 0;font-size:14px;color:#64748b;">If you need to make changes, just reply to this email and we'll take care of it.</p>
        </td></tr>
        <tr><td style="padding:18px 32px;background:#f8fafc;font-size:12px;color:#94a3b8;text-align:center;">Sent by ${escapeHtml(p.businessName)}</td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function providerEmailHtml(p: {
  ownerName: string; customerName: string; customerEmail: string; customerPhone: string;
  serviceName: string; dateLabel: string; timeLabel: string; priceLabel: string; primary: string;
}) {
  return `<!doctype html><html><body style="margin:0;background:#f6f7fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 1px 2px rgba(15,23,42,.06);">
        <tr><td style="padding:22px 26px;border-bottom:3px solid ${p.primary};">
          <div style="font-size:13px;color:#64748b;letter-spacing:.06em;text-transform:uppercase;">New booking alert</div>
          <div style="font-size:18px;font-weight:600;margin-top:4px;">${escapeHtml(p.customerName)} just booked ${escapeHtml(p.serviceName)}</div>
        </td></tr>
        <tr><td style="padding:20px 26px;font-size:14px;line-height:1.55;color:#334155;">
          <p style="margin:0 0 14px;">Hi ${escapeHtml(p.ownerName)}, a new appointment was just scheduled.</p>
          <ul style="margin:0 0 14px;padding-left:18px;">
            <li><strong>When:</strong> ${escapeHtml(p.dateLabel)} · ${escapeHtml(p.timeLabel)}</li>
            <li><strong>Service:</strong> ${escapeHtml(p.serviceName)} (${escapeHtml(p.priceLabel)})</li>
            <li><strong>Client:</strong> ${escapeHtml(p.customerName)}${p.customerEmail ? ` · ${escapeHtml(p.customerEmail)}` : ""}${p.customerPhone ? ` · ${escapeHtml(p.customerPhone)}` : ""}</li>
          </ul>
          <p style="margin:0;color:#64748b;font-size:13px;">Open your dashboard to view or reschedule.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
