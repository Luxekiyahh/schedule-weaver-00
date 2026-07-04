import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const testSmsSchema = z.object({
  phone: z.string().min(6).max(20),
});

// Sends a one-off test SMS to verify Twilio delivery. Requires an authenticated
// user who belongs to at least one workspace.
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

    try {
      const { sendSms } = await import("./twilio.server");
      const { sid } = await sendSms({
        to: data.phone,
        body: "Test message from ProcSchedule — your SMS notifications are working. 🎉",
      });
      return { ok: true as const, sid };
    } catch (err) {
      return { ok: false as const, error: err instanceof Error ? err.message : String(err) };
    }
  });
