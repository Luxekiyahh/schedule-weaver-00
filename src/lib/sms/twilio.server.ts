// Server-only Twilio SMS helper. Uses the direct Twilio REST API with HTTP
// Basic auth. Secrets are read from process.env inside the function so the
// Worker runtime can inject them per-request. Never import this from client
// (route component) code — only from other server code / server functions.

import { normalizePhoneToE164 } from "@/lib/phone";

export type SendSmsResult = { sid: string };

// Builds a plain-text SMS that mirrors the booking-confirmation email content.
export function buildConfirmationSms(d: {
  businessName?: string;
  firstName?: string;
  serviceName?: string;
  dateLabel?: string;
  timeLabel?: string;
  priceLabel?: string;
  addOns?: string;
  notes?: string;
  businessAddress?: string;
  businessPhone?: string;
  businessEmail?: string;
  businessWebsite?: string;
}): string {
  const business = d.businessName || "Our Studio";
  const lines: string[] = [];
  lines.push(`Hi ${d.firstName || "there"}, your appointment at ${business} is confirmed.`);
  lines.push("");
  if (d.serviceName) lines.push(`Service: ${d.serviceName}`);
  if (d.addOns) lines.push(`Add-ons: ${d.addOns}`);
  if (d.dateLabel) lines.push(`Date: ${d.dateLabel}`);
  if (d.timeLabel) lines.push(`Time: ${d.timeLabel}`);
  if (d.priceLabel) lines.push(`Total: ${d.priceLabel}`);
  if (d.notes) lines.push(`Notes: ${d.notes}`);
  if (d.businessAddress) {
    lines.push("");
    lines.push(`Location: ${d.businessAddress}`);
  }
  const contact: string[] = [];
  if (d.businessPhone) contact.push(`Phone: ${d.businessPhone}`);
  if (d.businessEmail) contact.push(`Email: ${d.businessEmail}`);
  if (d.businessWebsite) contact.push(`Web: ${d.businessWebsite}`);
  if (contact.length) {
    lines.push("");
    lines.push(...contact);
  }
  return lines.join("\n");
}

// Builds a waitlist "a slot just opened" SMS with a booking link.
export function buildWaitlistSms(d: {
  businessName?: string;
  firstName?: string;
  serviceName?: string;
  dateLabel?: string;
  timeLabel?: string;
  bookingUrl?: string;
}): string {
  const business = d.businessName || "Our Studio";
  const lines: string[] = [];
  lines.push(`Hi ${d.firstName || "there"}, a spot just opened at ${business}!`);
  if (d.serviceName) lines.push(`Service: ${d.serviceName}`);
  if (d.dateLabel) lines.push(`Date: ${d.dateLabel}`);
  if (d.timeLabel) lines.push(`Time: ${d.timeLabel}`);
  lines.push("");
  lines.push("First to book gets it:");
  if (d.bookingUrl) lines.push(d.bookingUrl);
  return lines.join("\n");
}

// Builds the "thank you for booking" SMS sent to the client after they book.
// Asks them to reply YES to confirm or NO to cancel.
export function buildBookingRequestSms(d: {
  businessName?: string;
  firstName?: string;
  serviceName?: string;
  dateLabel?: string;
  timeLabel?: string;
  priceLabel?: string;
  addOns?: string;
  businessAddress?: string;
  confirmCode?: string;
}): string {
  const business = d.businessName || "Our Studio";
  const lines: string[] = [];
  lines.push(`Hi ${d.firstName || "there"}, thank you for booking with ${business}!`);
  lines.push("");
  if (d.serviceName) lines.push(`Service: ${d.serviceName}`);
  if (d.addOns) lines.push(`Add-ons: ${d.addOns}`);
  if (d.dateLabel) lines.push(`Date: ${d.dateLabel}`);
  if (d.timeLabel) lines.push(`Time: ${d.timeLabel}`);
  if (d.priceLabel) lines.push(`Total: ${d.priceLabel}`);
  if (d.businessAddress) {
    lines.push("");
    lines.push(`Location: ${d.businessAddress}`);
  }
  lines.push("");
  // Include a short per-appointment code so the inbound handler can match
  // this reply to THIS booking (multi-tenant + repeat customers).
  if (d.confirmCode) {
    lines.push(`Reply YES ${d.confirmCode} to confirm or NO ${d.confirmCode} to cancel.`);
  } else {
    lines.push("Reply YES to confirm or NO to cancel.");
  }
  return lines.join("\n");
}

// Builds the new-booking alert SMS sent to the business owner/tenant.
export function buildOwnerAlertSms(
  d: {
    businessName?: string;
    customerName?: string;
    customerPhone?: string;
    serviceName?: string;
    dateLabel?: string;
    timeLabel?: string;
  },
  opts?: { confirmed?: boolean },
): string {
  const lines: string[] = [];
  const state = opts?.confirmed ? "confirmed" : "awaiting client confirmation";
  lines.push(`New booking${d.businessName ? ` at ${d.businessName}` : ""} (${state}):`);
  if (d.customerName) lines.push(`Client: ${d.customerName}`);
  if (d.customerPhone) lines.push(`Phone: ${d.customerPhone}`);
  if (d.serviceName) lines.push(`Service: ${d.serviceName}`);
  if (d.dateLabel) lines.push(`Date: ${d.dateLabel}`);
  if (d.timeLabel) lines.push(`Time: ${d.timeLabel}`);
  return lines.join("\n");
}






// Strict backstop: recipients should already be E.164 from the booking flow,
// but legacy rows may hold formatted numbers — normalize and reject anything
// that cannot form a valid E.164 number instead of letting Twilio 400 it.
function toE164(raw: string): string {
  const normalized = normalizePhoneToE164(raw);
  if (!normalized) throw new Error(`Invalid destination phone number: ${raw}`);
  return normalized;
}

export async function sendSms({
  to,
  body,
}: {
  to: string;
  body: string;
}): Promise<SendSmsResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !from) {
    throw new Error("Twilio is not configured (missing account SID, auth token, or phone number).");
  }

  const normalizedTo = toE164(to);

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: normalizedTo, From: from, Body: body }).toString(),
  });

  const data = (await res.json().catch(() => ({}))) as { sid?: string; message?: string };
  if (!res.ok) {
    throw new Error(`Twilio API error [${res.status}]: ${data.message ?? JSON.stringify(data)}`);
  }

  return { sid: data.sid ?? "" };
}
