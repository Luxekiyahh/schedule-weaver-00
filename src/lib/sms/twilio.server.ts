// Server-only Twilio SMS helper. Uses the direct Twilio REST API with HTTP
// Basic auth. Secrets are read from process.env inside the function so the
// Worker runtime can inject them per-request. Never import this from client
// (route component) code — only from other server code / server functions.

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
export function buildOwnerAlertSms(d: {
  businessName?: string;
  customerName?: string;
  customerPhone?: string;
  serviceName?: string;
  dateLabel?: string;
  timeLabel?: string;
}): string {
  const lines: string[] = [];
  lines.push(`New booking${d.businessName ? ` at ${d.businessName}` : ""} (awaiting client confirmation):`);
  if (d.customerName) lines.push(`Client: ${d.customerName}`);
  if (d.customerPhone) lines.push(`Phone: ${d.customerPhone}`);
  if (d.serviceName) lines.push(`Service: ${d.serviceName}`);
  if (d.dateLabel) lines.push(`Date: ${d.dateLabel}`);
  if (d.timeLabel) lines.push(`Time: ${d.timeLabel}`);
  return lines.join("\n");
}






function toE164(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("+")) {
    return "+" + trimmed.slice(1).replace(/[^\d]/g, "");
  }
  const digits = trimmed.replace(/[^\d]/g, "");
  // Assume US/CA when 10 digits and no country code provided.
  if (digits.length === 10) return "+1" + digits;
  return "+" + digits;
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
  if (normalizedTo.replace(/[^\d]/g, "").length < 8) {
    throw new Error(`Invalid destination phone number: ${to}`);
  }

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
