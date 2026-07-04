import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "crypto";

// Fired by the DB trigger when an appointment is cancelled. Texts matching
// waitlisted clients that a slot just opened. Secured with a shared secret
// header (same pattern as the appointment-confirmation hook).
export const Route = createFileRoute("/api/public/hooks/waitlist-notify")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.APPOINTMENT_WEBHOOK_SECRET || "webcapt26luxe";
        const provided = request.headers.get("x-webhook-secret") || "";
        const a = Buffer.from(provided);
        const b = Buffer.from(secret);
        if (a.length !== b.length || !timingSafeEqual(a, b)) {
          return new Response("Unauthorized", { status: 401 });
        }

        const body = (await request.json().catch(() => ({}))) as {
          workspace_id?: string;
          service_id?: string | null;
          provider_id?: string | null;
          start_at?: string;
          end_at?: string;
        };
        const workspaceId = body.workspace_id;
        if (!workspaceId) return Response.json({ ok: false, error: "missing workspace_id" });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Gate: only Enterprise workspaces with the waitlist feature.
        const { data: hasFeature } = await supabaseAdmin.rpc("workspace_has_feature", {
          _workspace_id: workspaceId,
          _feature: "waitlist_bidding",
        });
        if (!hasFeature) return Response.json({ ok: true, notified: 0, skipped: "feature" });

        const freedDate = body.start_at ? body.start_at.slice(0, 10) : null;

        // Match waiting entries: same service (or "any"), same provider (or "any"),
        // and either no date preference or a preference matching the freed day.
        let query = supabaseAdmin
          .from("waitlist_entries")
          .select("id, customer_name, customer_email, customer_phone, service_id, provider_id, desired_date")
          .eq("workspace_id", workspaceId)
          .eq("status", "waiting")
          .limit(25);
        const { data: entries } = await query;

        const matches = (entries ?? []).filter((e) => {
          if (e.service_id && body.service_id && e.service_id !== body.service_id) return false;
          if (e.provider_id && body.provider_id && e.provider_id !== body.provider_id) return false;
          if (e.desired_date && freedDate && e.desired_date !== freedDate) return false;
          return true;
        });
        if (matches.length === 0) return Response.json({ ok: true, notified: 0 });

        const { data: ws } = await supabaseAdmin
          .from("workspaces")
          .select("name, slug")
          .eq("id", workspaceId)
          .maybeSingle();
        const { data: svc } = body.service_id
          ? await supabaseAdmin.from("services").select("name").eq("id", body.service_id).maybeSingle()
          : { data: null as { name: string } | null };

        const origin = "https://schedule-weaver-00.lovable.app";
        const bookingUrl = ws?.slug ? `${origin}/booking/${ws.slug}` : origin;
        const dateLabel = freedDate
          ? new Date(`${freedDate}T00:00:00`).toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
            })
          : undefined;
        const timeLabel = body.start_at
          ? new Date(body.start_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
          : undefined;

        const { sendSms, buildWaitlistSms } = await import("@/lib/sms/twilio.server");

        let notified = 0;
        const notifiedIds: string[] = [];
        for (const e of matches) {
          if (!e.customer_phone) continue;
          try {
            await sendSms({
              to: e.customer_phone,
              body: buildWaitlistSms({
                businessName: ws?.name ?? undefined,
                firstName: (e.customer_name ?? "").split(" ")[0] || "there",
                serviceName: svc?.name ?? undefined,
                dateLabel,
                timeLabel,
                bookingUrl,
              }),
            });
            notified++;
            notifiedIds.push(e.id);
          } catch (err) {
            console.error("[waitlist-notify] sms failed", err);
          }
        }

        if (notifiedIds.length) {
          await supabaseAdmin
            .from("waitlist_entries")
            .update({ status: "notified", notified_at: new Date().toISOString() })
            .in("id", notifiedIds);
        }

        return Response.json({ ok: true, notified });
      },
    },
  },
});
