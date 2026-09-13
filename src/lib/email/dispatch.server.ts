import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendTemplateEmail } from "@/lib/email-templates/send-email";

// Server-only helper that renders a registered transactional template and
// sends it through Lovable's managed email API. Delivery, retries, rate
// limits, suppression, and unsubscribe handling live on Lovable's side.
//
// Never import this from client-reachable module scope; it uses the service
// role client. Import it inside server handlers only.

async function logSend(input: {
  templateName: string;
  recipientEmail: string;
  status: "sent" | "suppressed" | "failed";
  errorMessage?: string;
}): Promise<void> {
  const { error } = await supabaseAdmin.from("email_send_log").insert({
    message_id: null,
    template_name: input.templateName,
    recipient_email: input.recipientEmail,
    status: input.status,
    error_message: input.errorMessage ?? null,
  });
  if (error) {
    console.error("[email] failed to write email_send_log", {
      code: error.code,
      message: error.message,
    });
  }
}

export async function sendTransactionalEmail(input: {
  templateName: string;
  recipientEmail: string;
  idempotencyKey?: string;
  templateData?: Record<string, unknown>;
}): Promise<{ ok: boolean; reason?: string }> {
  const recipient = input.recipientEmail;

  try {
    const result = await sendTemplateEmail(input.templateName, recipient, {
      templateData: input.templateData as Record<string, any> | undefined,
      idempotencyKey: input.idempotencyKey,
    });

    if (!result.sent) {
      await logSend({
        templateName: input.templateName,
        recipientEmail: recipient,
        status: "suppressed",
      });
      return { ok: false, reason: "email_suppressed" };
    }

    await logSend({
      templateName: input.templateName,
      recipientEmail: recipient,
      status: "sent",
    });
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown send error";
    console.error("[email] send failed", { templateName: input.templateName, message });
    await logSend({
      templateName: input.templateName,
      recipientEmail: recipient,
      status: "failed",
      errorMessage: message,
    });
    return { ok: false, reason: "send_failed" };
  }
}
