import { createFileRoute } from "@tanstack/react-router";

// Public webhook endpoint invoked by a Supabase database webhook on
// INSERT into public.appointments. Authenticates the caller via a shared
// secret header (APPOINTMENT_WEBHOOK_SECRET).
//
// Confirmation + owner-alert emails now go through Lovable's queued email
// system (verified domain notify.procschedule.com) instead of the previous
// Resend `onboarding@resend.dev` sandbox sender, which only delivered to the
// Resend account owner — so in practice nobody received booking emails.

type AppointmentRecord = {
  id: string;
  workspace_id: string;
  service_id: string;
  customer_id: string;
  provider_id: string;
  start_at: string;
  end_at: string;
  status: string;
  notes: string | null;
};

type WebhookPayload = {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  schema: string;
  record: AppointmentRecord;
  old_record: AppointmentRecord | null;
};

export const Route = createFileRoute("/api/public/appointment-confirmation")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = request.headers.get("x-webhook-secret");
        if (!secret || secret !== process.env.APPOINTMENT_WEBHOOK_SECRET) {
          return new Response("Unauthorized", { status: 401 });
        }

        let payload: WebhookPayload;
        try {
          payload = (await request.json()) as WebhookPayload;
        } catch {
          return Response.json({ ok: false, error: "invalid_json" }, { status: 200 });
        }

        if (payload.type !== "INSERT" || payload.table !== "appointments" || !payload.record) {
          return Response.json({ ok: true, skipped: "not_insert" });
        }

        const appt = payload.record;
        // Deposit bookings are inserted as "pending" and confirmed later by the
        // payment step, which sends its own emails. Only email on real confirms.
        if (appt.status !== "confirmed") {
          return Response.json({ ok: true, skipped: `status_${appt.status}` });
        }

        try {
          const { sendAppointmentEmails } = await import(
            "@/lib/email/appointment-emails.server"
          );
          await sendAppointmentEmails(appt.id);
          return Response.json({ ok: true });
        } catch (err) {
          console.error("[appointment-confirmation] failed", err);
          return Response.json({ ok: false, error: String(err) }, { status: 200 });
        }
      },
    },
  },
});
