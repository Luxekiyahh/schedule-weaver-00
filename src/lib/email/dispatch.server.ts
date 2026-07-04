import * as React from "react";
import { render } from "react-email";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { TEMPLATES } from "@/lib/email-templates/registry";

// Server-only helper that renders a registered transactional template and
// enqueues it for the email dispatcher — mirroring the logic in
// src/routes/lovable/email/transactional/send.ts, but usable from trusted
// server code (webhooks, server functions) WITHOUT a Supabase user JWT.
//
// Never import this from client-reachable module scope; it uses the service
// role client. Import it inside server handlers only.

const SITE_NAME = "schedule-weaver-00";
const SENDER_DOMAIN = "notify.procschedule.com";
const FROM_DOMAIN = "notify.procschedule.com";

function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function enqueueTransactionalEmail(input: {
  templateName: string;
  recipientEmail: string;
  idempotencyKey?: string;
  templateData?: Record<string, unknown>;
}): Promise<{ ok: boolean; reason?: string }> {
  const template = TEMPLATES[input.templateName];
  if (!template) {
    console.error("[email] template not found", input.templateName);
    return { ok: false, reason: "template_not_found" };
  }

  const effectiveRecipient = template.to || input.recipientEmail;
  if (!effectiveRecipient) return { ok: false, reason: "no_recipient" };

  const messageId = crypto.randomUUID();
  const idempotencyKey = input.idempotencyKey || messageId;
  const normalizedEmail = effectiveRecipient.toLowerCase();

  // Suppression check (fail-closed).
  const { data: suppressed, error: suppressionError } = await supabaseAdmin
    .from("suppressed_emails")
    .select("id")
    .eq("email", normalizedEmail)
    .maybeSingle();
  if (suppressionError) {
    console.error("[email] suppression check failed", suppressionError);
    return { ok: false, reason: "suppression_check_failed" };
  }
  if (suppressed) {
    await supabaseAdmin.from("email_send_log").insert({
      message_id: messageId,
      template_name: input.templateName,
      recipient_email: effectiveRecipient,
      status: "suppressed",
    });
    return { ok: false, reason: "email_suppressed" };
  }

  // Get or create unsubscribe token.
  let unsubscribeToken: string;
  const { data: existingToken } = await supabaseAdmin
    .from("email_unsubscribe_tokens")
    .select("token, used_at")
    .eq("email", normalizedEmail)
    .maybeSingle();

  if (existingToken && !existingToken.used_at) {
    unsubscribeToken = existingToken.token;
  } else {
    unsubscribeToken = generateToken();
    await supabaseAdmin
      .from("email_unsubscribe_tokens")
      .upsert(
        { token: unsubscribeToken, email: normalizedEmail },
        { onConflict: "email", ignoreDuplicates: true },
      );
    const { data: storedToken } = await supabaseAdmin
      .from("email_unsubscribe_tokens")
      .select("token")
      .eq("email", normalizedEmail)
      .maybeSingle();
    if (storedToken) unsubscribeToken = storedToken.token;
  }

  // Render.
  const element = React.createElement(template.component, input.templateData ?? {});
  const html = await render(element);
  const plainText = await render(element, { plainText: true });
  const resolvedSubject =
    typeof template.subject === "function"
      ? template.subject(input.templateData ?? {})
      : template.subject;

  await supabaseAdmin.from("email_send_log").insert({
    message_id: messageId,
    template_name: input.templateName,
    recipient_email: effectiveRecipient,
    status: "pending",
  });

  const { error: enqueueError } = await supabaseAdmin.rpc("enqueue_email", {
    queue_name: "transactional_emails",
    payload: {
      message_id: messageId,
      to: effectiveRecipient,
      from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
      sender_domain: SENDER_DOMAIN,
      subject: resolvedSubject,
      html,
      text: plainText,
      purpose: "transactional",
      label: input.templateName,
      idempotency_key: idempotencyKey,
      unsubscribe_token: unsubscribeToken,
      queued_at: new Date().toISOString(),
    },
  });

  if (enqueueError) {
    console.error("[email] enqueue failed", enqueueError);
    await supabaseAdmin.from("email_send_log").insert({
      message_id: messageId,
      template_name: input.templateName,
      recipient_email: effectiveRecipient,
      status: "failed",
      error_message: "Failed to enqueue email",
    });
    return { ok: false, reason: "enqueue_failed" };
  }

  return { ok: true };
}
