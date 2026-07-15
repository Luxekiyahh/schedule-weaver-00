import { createFileRoute } from "@tanstack/react-router";

// Public webhook Twilio calls when a client replies to the booking-request SMS.
// The client replies YES to confirm their pending appointment or NO to cancel.
//
// Security: Twilio signs every request with X-Twilio-Signature (HMAC-SHA1 over
// the full URL + POST params, keyed by the account auth token). We verify it
// with Web Crypto (Worker-safe) before touching any data.

function toE164(raw: string): string {
  const trimmed = (raw || "").trim();
  if (trimmed.startsWith("+")) return "+" + trimmed.slice(1).replace(/[^\d]/g, "");
  const digits = trimmed.replace(/[^\d]/g, "");
  if (digits.length === 10) return "+1" + digits;
  return "+" + digits;
}

function phoneVariants(e164: string): string[] {
  // customers.phone may have been stored un-normalized; match a few forms.
  const digits = e164.replace(/[^\d]/g, "");
  const variants = new Set<string>([e164, digits]);
  if (digits.length === 11 && digits.startsWith("1")) {
    variants.add(digits.slice(1));
    variants.add("+" + digits);
  }
  return Array.from(variants);
}

async function verifyTwilioSignature(
  url: string,
  params: Record<string, string>,
  signature: string,
  authToken: string,
): Promise<boolean> {
  // Twilio: concatenate the URL, then each POST param sorted by key as key+value.
  const sortedKeys = Object.keys(params).sort();
  let data = url;
  for (const k of sortedKeys) data += k + params[k];

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(authToken),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const sigBuf = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  const computed = btoa(String.fromCharCode(...new Uint8Array(sigBuf)));
  // Constant-time-ish compare.
  if (computed.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < computed.length; i++) diff |= computed.charCodeAt(i) ^ signature.charCodeAt(i);
  return diff === 0;
}

function twiml(message: string): Response {
  const escaped = message
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escaped}</Message></Response>`,
    { headers: { "Content-Type": "text/xml" } },
  );
}

export const Route = createFileRoute("/api/public/sms/inbound")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        if (!authToken) {
          console.error("[sms-inbound] TWILIO_AUTH_TOKEN not configured");
          return new Response("Not configured", { status: 500 });
        }

        const raw = await request.text();
        const form = new URLSearchParams(raw);
        const params: Record<string, string> = {};
        for (const [k, v] of form.entries()) params[k] = v;

        const signature = request.headers.get("x-twilio-signature") || "";
        const ok = await verifyTwilioSignature(request.url, params, signature, authToken);
        if (!ok) {
          console.error("[sms-inbound] invalid Twilio signature");
          return new Response("Invalid signature", { status: 403 });
        }

        const from = toE164(params.From || "");
        const rawBody = (params.Body || "").trim();
        const body = rawBody.toLowerCase();
        const isYes = /^(y|yes|yeah|yep|confirm)\b/.test(body);
        const isNo = /^(n|no|nope|cancel)\b/.test(body);

        if (!isYes && !isNo) {
          return twiml("Please reply YES to confirm your appointment or NO to cancel.");
        }

        // Extract a per-appointment 6-char hex token that we embed in the
        // outbound booking-request SMS. Without it we cannot safely disambiguate
        // between multiple pending appointments on the same phone number.
        const codeMatch = rawBody.match(/\b([0-9a-fA-F]{6})\b/);
        const code = codeMatch ? codeMatch[1].toLowerCase() : null;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Find the customer(s) with this phone.
        const { data: customers } = await supabaseAdmin
          .from("customers")
          .select("id")
          .in("phone", phoneVariants(from));
        const customerIds = (customers ?? []).map((c) => c.id);
        if (!customerIds.length) {
          return twiml("We couldn't find a matching appointment for this number.");
        }

        // Only look at pending appointments that are NOT waiting on a
        // deposit — those flip to confirmed via the payment webhook, not SMS.
        const { data: pendingAppts } = await supabaseAdmin
          .from("appointments")
          .select("id, status, deposit_cents, square_order_id, created_at")
          .in("customer_id", customerIds)
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(25);

        const eligible = (pendingAppts ?? []).filter(
          (a) =>
            !a.square_order_id &&
            !(a.deposit_cents && Number(a.deposit_cents) > 0),
        );

        // Prefer the token match; fall back only when there's exactly one
        // eligible pending appointment (unambiguous).
        let appt: { id: string } | undefined;
        if (code) {
          appt = eligible.find(
            (a) => a.id.replace(/-/g, "").slice(0, 6).toLowerCase() === code,
          );
        }
        if (!appt) {
          if (!code && eligible.length === 1) {
            appt = eligible[0];
          } else if (eligible.length > 1) {
            return twiml(
              "We found more than one pending booking for this number. Please reply with the code from your booking text, e.g. YES ABC123.",
            );
          }
        }

        if (!appt) {
          return twiml("You have no appointment awaiting confirmation.");
        }


        if (isYes) {
          await supabaseAdmin
            .from("appointments")
            .update({ status: "confirmed" })
            .eq("id", appt.id);
          // Fire the confirmation email path now that it's confirmed.
          try {
            const { sendAppointmentEmails } = await import(
              "@/lib/email/appointment-emails.server"
            );
            await sendAppointmentEmails(appt.id);
          } catch (err) {
            console.error("[sms-inbound] confirmation emails failed", err);
          }
          return twiml("Your appointment is confirmed. See you soon!");
        }

        // NO → cancel and free the slot.
        await supabaseAdmin
          .from("appointments")
          .update({ status: "cancelled" })
          .eq("id", appt.id);
        return twiml("Your appointment has been cancelled. We hope to see you another time.");
      },
    },
  },
});
