import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const joinWaitlistSchema = z.object({
  workspaceId: z.string().uuid(),
  serviceId: z.string().uuid().nullable().optional(),
  providerMemberId: z.string().uuid().nullable().optional(),
  firstName: z.string().min(1).max(80),
  lastName: z.string().max(80).optional().default(""),
  email: z.string().email().max(200),
  phone: z.string().min(6).max(30).optional().nullable(),
  desiredDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

// Public: lets a booking-page visitor join a workspace waitlist. Only added
// for workspaces on a tier with the waitlist feature; otherwise a no-op.
export const joinWaitlist = createServerFn({ method: "POST" })
  .inputValidator((input) => joinWaitlistSchema.parse(input))
  .handler(async ({ data }) => {
    const { data: hasFeature } = await supabaseAdmin.rpc("workspace_has_feature", {
      _workspace_id: data.workspaceId,
      _feature: "waitlist_bidding",
    });
    if (!hasFeature) {
      return { ok: false as const, error: "Waitlist isn't available for this business." };
    }

    const fullName = `${data.firstName} ${data.lastName ?? ""}`.trim();
    const { error } = await supabaseAdmin.from("waitlist_entries").insert({
      workspace_id: data.workspaceId,
      service_id: data.serviceId ?? null,
      provider_id: data.providerMemberId ?? null,
      customer_name: fullName,
      customer_email: data.email,
      customer_phone: data.phone ?? null,
      desired_date: data.desiredDate ?? null,
      status: "waiting",
    });
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  });
