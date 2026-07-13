import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendSms, type SendSmsResult } from "./twilio.server";

// Server-only wrapper around sendSms that records every attempt (and its
// result) into public.sms_send_log so operators can review Twilio activity.
// Best-effort logging: a logging failure never blocks or throws over the send.
export async function logAndSendSms(input: {
  to: string;
  body: string;
  workspaceId?: string | null;
  purpose?: string;
}): Promise<SendSmsResult> {
  try {
    const result = await sendSms({ to: input.to, body: input.body });
    try {
      await supabaseAdmin.from("sms_send_log").insert({
        workspace_id: input.workspaceId ?? null,
        to_number: input.to,
        body: input.body,
        purpose: input.purpose ?? null,
        twilio_sid: result.sid || null,
        status: "sent",
      });
    } catch (logErr) {
      console.error("[sms] log insert failed", logErr);
    }
    return result;
  } catch (err) {
    try {
      await supabaseAdmin.from("sms_send_log").insert({
        workspace_id: input.workspaceId ?? null,
        to_number: input.to,
        body: input.body,
        purpose: input.purpose ?? null,
        status: "failed",
        error_message: err instanceof Error ? err.message : String(err),
      });
    } catch (logErr) {
      console.error("[sms] failure log insert failed", logErr);
    }
    throw err;
  }
}
