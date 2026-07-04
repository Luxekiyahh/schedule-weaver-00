import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const testSmsSchema = z.object({
  phone: z.string().min(6).max(20),
});

// Sends a one-off test SMS that mirrors the booking-confirmation email content.
// Requires an authenticated user who belongs to at least one workspace; uses
// that workspace's own business info so the preview matches real sends.
export const sendTestSms = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => testSmsSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: membership } = await supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", userId)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (!membership) {
      return { ok: false as const, error: "You are not a member of any workspace." };
    }

    const { data: ws } = await supabase
      .from("workspaces")
      .select("name, business_address, business_phone, business_email, business_website")
      .eq("id", membership.workspace_id)
      .maybeSingle();

    try {
      const { sendSms, buildConfirmationSms } = await import("./twilio.server");
      const { sid } = await sendSms({
        to: data.phone,
        body: buildConfirmationSms({
          businessName: ws?.name ?? "Our Studio",
          firstName: "there",
          serviceName: "Sample Service",
          dateLabel: "Friday, July 10, 2026",
          timeLabel: "10:00 AM – 11:00 AM",
          priceLabel: "$75.00",
          businessAddress: ws?.business_address ?? "",
          businessPhone: ws?.business_phone ?? "",
          businessEmail: ws?.business_email ?? "",
          businessWebsite: ws?.business_website ?? "",
        }),
      });
      return { ok: true as const, sid };
    } catch (err) {
      return { ok: false as const, error: err instanceof Error ? err.message : String(err) };
    }
  });
