// Server-only Twilio SMS helper. Uses the direct Twilio REST API with HTTP
// Basic auth. Secrets are read from process.env inside the function so the
// Worker runtime can inject them per-request. Never import this from client
// (route component) code — only from other server code / server functions.

export type SendSmsResult = { sid: string };

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
