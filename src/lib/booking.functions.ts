import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const getBookingWorkspace = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ slug: z.string().min(1).max(120) }).parse(input))
  .handler(async ({ data }) => {
    const { data: ws, error } = await supabaseAdmin
      .from("workspaces")
      .select("id, name, slug, timezone, theme_config")
      .eq("slug", data.slug)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!ws)
      return {
        workspace: null,
        services: [],
        providers: [],
        serviceProviders: [],
        categories: [],
        lengthOptions: [],
        hairColors: [],
        payment: null,
      };

    const [
      { data: services },
      { data: members },
      { data: links },
      { data: categories },
      { data: lengthOptions },
      { data: hairColors },
      { data: paySettings },
    ] = await Promise.all([
      supabaseAdmin
        .from("services")
        .select(
          "id, name, description, duration_minutes, price_cents, currency, category_id, image_url",
        )
        .eq("workspace_id", ws.id)
        .eq("is_active", true)
        .order("created_at", { ascending: true }),
      supabaseAdmin
        .from("workspace_members")
        .select("id, user_id, role")
        .eq("workspace_id", ws.id)
        .eq("is_active", true),
      supabaseAdmin
        .from("service_providers")
        .select("service_id, member_id")
        .eq("workspace_id", ws.id),
      supabaseAdmin
        .from("service_categories")
        .select("id, name, description, sort_order, image_url")
        .eq("workspace_id", ws.id)
        .eq("active", true)
        .order("sort_order", { ascending: true }),
      supabaseAdmin
        .from("service_length_options")
        .select("id, name, duration_min, price_cents, sort_order")
        .eq("workspace_id", ws.id)
        .eq("active", true)
        .order("sort_order", { ascending: true }),
      supabaseAdmin
        .from("service_hair_colors")
        .select("id, code, label, swatch_hex, sort_order")
        .eq("workspace_id", ws.id)
        .eq("active", true)
        .order("sort_order", { ascending: true }),
      supabaseAdmin
        .from("workspace_payment_settings")
        .select("provider, connection_status, deposit_type, deposit_amount_cents, deposit_percent, currency")
        .eq("workspace_id", ws.id)
        .maybeSingle(),
    ]);

    const userIds = (members ?? []).map((m) => m.user_id);
    const { data: profs } = userIds.length
      ? await supabaseAdmin.from("profiles").select("id, full_name").in("id", userIds)
      : { data: [] as { id: string; full_name: string | null }[] };
    const profMap = new Map((profs ?? []).map((p) => [p.id, p.full_name]));

    const providers = (members ?? []).map((m) => ({
      member_id: m.id,
      name: profMap.get(m.user_id) ?? "Team member",
    }));

    // Only expose a deposit requirement when a provider is actually connected
    // and the tenant configured a non-zero deposit.
    const ps = paySettings as
      | {
          provider: string;
          connection_status: string;
          deposit_type: string;
          deposit_amount_cents: number;
          deposit_percent: number;
          currency: string | null;
        }
      | null;
    const payment =
      ps &&
      ps.provider &&
      // Only providers with an implemented deposit-checkout path may surface a
      // deposit requirement. PayPal has no Orders/Checkout flow wired up yet, so
      // exposing it would promise a "deposit" the booking flow never collects.
      (ps.provider === "stripe" || ps.provider === "square") &&
      ps.connection_status === "connected" &&
      ps.deposit_type &&
      ps.deposit_type !== "none"
        ? {
            provider: ps.provider,
            depositType: ps.deposit_type,
            depositAmountCents: Number(ps.deposit_amount_cents ?? 0),
            depositPercent: Number(ps.deposit_percent ?? 0),
            currency: ps.currency ?? "USD",
          }
        : null;

    const { data: waitlistEnabled } = await supabaseAdmin.rpc("workspace_has_feature", {
      _workspace_id: ws.id,
      _feature: "waitlist_bidding",
    });

    return {
      workspace: ws,
      services: services ?? [],
      providers,
      serviceProviders: links ?? [],
      categories: categories ?? [],
      lengthOptions: lengthOptions ?? [],
      hairColors: hairColors ?? [],
      payment,
      waitlistEnabled: Boolean(waitlistEnabled),
    };
  });

export const getBookingSlots = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({
      workspaceId: z.string().uuid(),
      memberIds: z.array(z.string().uuid()).min(1),
      durationMinutes: z.number().int().min(5).max(720),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    const dow = new Date(`${data.date}T12:00:00Z`).getUTCDay();
    const [{ data: avail }, { data: appts }, { data: exceptions }] = await Promise.all([
      supabaseAdmin
        .from("provider_availability")
        .select("member_id, start_time, end_time, day_of_week")
        .eq("workspace_id", data.workspaceId)
        .in("member_id", data.memberIds)
        .eq("day_of_week", dow),
      supabaseAdmin
        .from("appointments")
        .select("provider_id, start_at, end_at, status")
        .eq("workspace_id", data.workspaceId)
        .in("provider_id", data.memberIds)
        .gte("start_at", `${data.date}T00:00:00Z`)
        .lt("start_at", `${data.date}T23:59:59Z`)
        .neq("status", "cancelled"),
      supabaseAdmin
        .from("schedule_exceptions")
        .select("block_date, start_time, end_time")
        .eq("workspace_id", data.workspaceId)
        .eq("block_date", data.date),
    ]);


    const toMin = (t: string) => {
      const [h, m] = t.split(":").map(Number);
      return h * 60 + m;
    };
    const slots: { time: string; member_id: string }[] = [];
    const seenTimes = new Set<string>();

    // Blocked ranges from schedule_exceptions (owner "Enforce Time Off").
    // A block with null start/end covers the entire day.
    const blockedRanges = (exceptions ?? []).map((ex) => ({
      start: ex.start_time ? toMin(ex.start_time) : 0,
      end: ex.end_time ? toMin(ex.end_time) : 24 * 60,
    }));

    for (const a of avail ?? []) {
      const start = toMin(a.start_time);
      const end = toMin(a.end_time);
      const memberAppts = (appts ?? []).filter((p) => p.provider_id === a.member_id);
      for (let m = start; m + data.durationMinutes <= end; m += data.durationMinutes) {
        const slotMinEnd = m + data.durationMinutes;
        // Skip slots overlapping an owner time-off block.
        const blocked = blockedRanges.some((b) => b.start < slotMinEnd && b.end > m);
        if (blocked) continue;
        const hh = String(Math.floor(m / 60)).padStart(2, "0");
        const mm = String(m % 60).padStart(2, "0");
        const slotStartIso = new Date(`${data.date}T${hh}:${mm}:00`).toISOString();
        const slotStart = new Date(slotStartIso).getTime();
        const slotEnd = slotStart + data.durationMinutes * 60000;
        const conflict = memberAppts.some((ap) => {
          const s = new Date(ap.start_at).getTime();
          const e = new Date(ap.end_at).getTime();
          return s < slotEnd && e > slotStart;
        });
        if (conflict) continue;
        const key = `${hh}:${mm}-${a.member_id}`;
        if (seenTimes.has(key)) continue;
        seenTimes.add(key);
        if (slotStart > Date.now()) slots.push({ time: `${hh}:${mm}`, member_id: a.member_id });
      }
    }
    slots.sort((a, b) => a.time.localeCompare(b.time));
    return { slots };
  });

const addOnSchema = z
  .array(z.object({ name: z.string().max(120), priceCents: z.number().int().min(0) }))
  .max(20)
  .optional()
  .default([]);

const bookingInput = z.object({
  workspaceId: z.string().uuid(),
  serviceId: z.string().uuid(),
  providerMemberId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().min(6).max(20),
  notes: z.string().trim().max(1000).optional().default(""),
  addOns: addOnSchema,
});

type BookingInput = z.infer<typeof bookingInput>;

// Validates availability, resolves the customer, and inserts the appointment
// with the given status. Shared by the direct-confirm and deposit flows.
async function prepareAndInsertAppointment(data: BookingInput, status: "confirmed" | "pending") {
  const { data: svc, error: svcErr } = await supabaseAdmin
    .from("services")
    .select("id, name, duration_minutes, price_cents, currency, workspace_id, is_active")
    .eq("id", data.serviceId)
    .eq("workspace_id", data.workspaceId)
    .maybeSingle();
  if (svcErr) throw new Error(svcErr.message);
  if (!svc || !svc.is_active) throw new Error("Service unavailable");

  const startIso = new Date(`${data.date}T${data.time}:00`).toISOString();
  const endIso = new Date(new Date(startIso).getTime() + svc.duration_minutes * 60000).toISOString();

  const toMin = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };

  // Owner time-off blocks.
  const { data: blocks } = await supabaseAdmin
    .from("schedule_exceptions")
    .select("start_time, end_time")
    .eq("workspace_id", data.workspaceId)
    .eq("block_date", data.date);
  const slotStartMin = toMin(data.time);
  const slotEndMin = slotStartMin + svc.duration_minutes;
  const isBlocked = (blocks ?? []).some((b) => {
    const bStart = b.start_time ? toMin(b.start_time) : 0;
    const bEnd = b.end_time ? toMin(b.end_time) : 24 * 60;
    return bStart < slotEndMin && bEnd > slotStartMin;
  });
  if (isBlocked) throw new Error("That time is no longer available. Please pick another slot.");

  // Conflict re-check (ignore pending holds older than 20 min so abandoned
  // deposit checkouts don't block the slot forever).
  const { data: conflict } = await supabaseAdmin
    .from("appointments")
    .select("id, status, created_at")
    .eq("workspace_id", data.workspaceId)
    .eq("provider_id", data.providerMemberId)
    .neq("status", "cancelled")
    .lt("start_at", endIso)
    .gt("end_at", startIso);
  const active = (conflict ?? []).filter((c) => {
    if (c.status !== "pending") return true;
    return Date.now() - new Date(c.created_at as string).getTime() < 20 * 60 * 1000;
  });
  if (active.length) throw new Error("That time was just booked. Please pick another slot.");

  // Find or create customer.
  const fullName = `${data.firstName} ${data.lastName}`.trim();
  const { data: existing } = await supabaseAdmin
    .from("customers")
    .select("id, require_prepay, phone")
    .eq("workspace_id", data.workspaceId)
    .eq("email", data.email)
    .maybeSingle();

  let customerId = existing?.id as string | undefined;
  let requirePrepay = Boolean(existing?.require_prepay);
  if (!customerId) {
    const { data: ins, error: insErr } = await supabaseAdmin
      .from("customers")
      .insert({ workspace_id: data.workspaceId, full_name: fullName, email: data.email, phone: data.phone })
      .select("id")
      .single();
    if (insErr) throw new Error(insErr.message);
    customerId = ins.id;
  } else if (data.phone && !existing?.phone) {
    // Backfill phone on returning customers who never had one saved.
    await supabaseAdmin.from("customers").update({ phone: data.phone }).eq("id", customerId);
  }

  // No-show prepay only applies on Enterprise workspaces with the feature.
  if (requirePrepay) {
    const { data: hasFeature } = await supabaseAdmin.rpc("workspace_has_feature", {
      _workspace_id: data.workspaceId,
      _feature: "no_show_prepay",
    });
    requirePrepay = Boolean(hasFeature);
  }

  // Compose notes with add-ons so providers + emails can surface them.
  const addOnLabel = (data.addOns ?? [])
    .map((a) => (a.priceCents ? `${a.name} (+$${(a.priceCents / 100).toFixed(0)})` : a.name))
    .join(", ");
  const notes = [data.notes || null, addOnLabel ? `Add-ons: ${addOnLabel}` : null]
    .filter(Boolean)
    .join("\n") || null;

  const { data: appt, error: apptErr } = await supabaseAdmin
    .from("appointments")
    .insert({
      workspace_id: data.workspaceId,
      service_id: data.serviceId,
      provider_id: data.providerMemberId,
      customer_id: customerId,
      start_at: startIso,
      end_at: endIso,
      status,
      notes,
    })
    .select("id")
    .single();
  if (apptErr) throw new Error(apptErr.message);

  const addOnTotal = (data.addOns ?? []).reduce((s, a) => s + a.priceCents, 0);
  return {
    appointmentId: appt.id as string,
    startIso,
    endIso,
    service: svc,
    basePriceCents: (svc.price_cents ?? 0) + addOnTotal,
    requirePrepay,
  };
}

export const createBooking = createServerFn({ method: "POST" })
  .inputValidator((input) => bookingInput.parse(input))
  .handler(async ({ data }) => {
    // Booking stays pending until the client confirms by replying YES to the
    // text message. Inserting as "pending" skips the confirmed-only email
    // webhook; we send the booking-request + owner-alert SMS directly here.
    const res = await prepareAndInsertAppointment(data, "pending");
    try {
      const { sendBookingSms } = await import("@/lib/sms/booking-sms.server");
      await sendBookingSms(res.appointmentId);
    } catch (err) {
      console.error("[createBooking] SMS dispatch failed", err);
    }
    return { ok: true, start_at: res.startIso, end_at: res.endIso, pending: true };
  });

function computeDepositCents(
  basePriceCents: number,
  settings: { depositType: string; depositAmountCents: number; depositPercent: number },
): number {
  if (settings.depositType === "full") return basePriceCents;
  if (settings.depositType === "deposit") {
    if (settings.depositAmountCents > 0) return settings.depositAmountCents;
    if (settings.depositPercent > 0) return Math.round((basePriceCents * settings.depositPercent) / 100);
  }
  return 0;
}

// Creates a pending appointment and a Stripe Checkout Session on the TENANT's
// own Stripe account (direct api.stripe.com call with their secret key).
export const createDepositCheckout = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    bookingInput.extend({ origin: z.string().url().max(500), slug: z.string().min(1).max(120) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { data: settings } = await supabaseAdmin
      .from("workspace_payment_settings")
      .select("provider, connection_status, deposit_type, deposit_amount_cents, deposit_percent, currency")
      .eq("workspace_id", data.workspaceId)
      .maybeSingle();
    if (
      !settings ||
      settings.provider !== "stripe" ||
      settings.connection_status !== "connected" ||
      settings.deposit_type === "none"
    ) {
      throw new Error("This business isn't set up to collect deposits via card.");
    }

    const { data: creds } = await supabaseAdmin
      .from("workspace_payment_credentials")
      .select("stripe_secret_key")
      .eq("workspace_id", data.workspaceId)
      .maybeSingle();
    const secretKey = creds?.stripe_secret_key;
    if (!secretKey) throw new Error("This business hasn't finished connecting its payment account.");

    const inserted = await prepareAndInsertAppointment(data, "pending");
    const currency = (settings.currency || inserted.service.currency || "USD").toLowerCase();
    const depositCents = computeDepositCents(inserted.basePriceCents, {
      depositType: inserted.requirePrepay ? "full" : settings.deposit_type,
      depositAmountCents: Number(settings.deposit_amount_cents ?? 0),
      depositPercent: Number(settings.deposit_percent ?? 0),
    });
    if (depositCents < 50) throw new Error("The configured deposit amount is too small to charge.");

    const origin = data.origin.replace(/\/$/, "");
    const successUrl = `${origin}/booking/${data.slug}?appt=${inserted.appointmentId}&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${origin}/booking/${data.slug}?appt=${inserted.appointmentId}&deposit=cancelled`;
    const label =
      settings.deposit_type === "full" ? `${inserted.service.name}` : `Deposit — ${inserted.service.name}`;

    const params = new URLSearchParams();
    params.set("mode", "payment");
    params.set("success_url", successUrl);
    params.set("cancel_url", cancelUrl);
    params.set("customer_email", data.email);
    params.set("line_items[0][quantity]", "1");
    params.set("line_items[0][price_data][currency]", currency);
    params.set("line_items[0][price_data][unit_amount]", String(depositCents));
    params.set("line_items[0][price_data][product_data][name]", label);
    params.set("payment_intent_data[description]", label);
    params.set("metadata[appointment_id]", inserted.appointmentId);

    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });
    const json = (await res.json().catch(() => ({}))) as {
      url?: string;
      error?: { message?: string };
    };
    if (!res.ok || !json.url) {
      // Roll back the pending hold so the slot frees up.
      await supabaseAdmin.from("appointments").delete().eq("id", inserted.appointmentId);
      throw new Error(json.error?.message || "Could not start checkout. Please try again.");
    }

    return { url: json.url, appointmentId: inserted.appointmentId, depositCents };
  });

// Verifies a completed Checkout Session and confirms the pending appointment.
export const confirmDepositBooking = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({ appointmentId: z.string().uuid(), sessionId: z.string().min(1).max(255) })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { data: appt } = await supabaseAdmin
      .from("appointments")
      .select("id, workspace_id, status, start_at, end_at")
      .eq("id", data.appointmentId)
      .maybeSingle();
    if (!appt) throw new Error("Booking not found.");
    if (appt.status === "confirmed") return { ok: true, start_at: appt.start_at, end_at: appt.end_at };

    const { data: creds } = await supabaseAdmin
      .from("workspace_payment_credentials")
      .select("stripe_secret_key")
      .eq("workspace_id", appt.workspace_id)
      .maybeSingle();
    const secretKey = creds?.stripe_secret_key;
    if (!secretKey) throw new Error("Payment account unavailable.");

    const res = await fetch(
      `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(data.sessionId)}`,
      { headers: { Authorization: `Bearer ${secretKey}` } },
    );
    const json = (await res.json().catch(() => ({}))) as {
      payment_status?: string;
      metadata?: { appointment_id?: string };
      error?: { message?: string };
    };
    if (!res.ok) throw new Error(json.error?.message || "Could not verify payment.");
    if (json.metadata?.appointment_id !== data.appointmentId) {
      throw new Error("Payment does not match this booking.");
    }
    if (json.payment_status !== "paid") {
      throw new Error("Your deposit hasn't been received yet. Please complete payment.");
    }

    const { error: updErr } = await supabaseAdmin
      .from("appointments")
      .update({ status: "confirmed" })
      .eq("id", data.appointmentId);
    if (updErr) throw new Error(updErr.message);

    try {
      const { sendAppointmentEmails } = await import("@/lib/email/appointment-emails.server");
      await sendAppointmentEmails(data.appointmentId);
    } catch (e) {
      console.error("[confirmDepositBooking] email dispatch failed", e);
    }

    return { ok: true, start_at: appt.start_at, end_at: appt.end_at };
  });

// ---------------------------------------------------------------------------
// Square deposit flow (mirrors the Stripe path, on the TENANT's Square account)
// ---------------------------------------------------------------------------

function squareApiBase(environment: string | null | undefined): string {
  return environment === "sandbox"
    ? "https://connect.squareupsandbox.com"
    : "https://connect.squareup.com";
}

const SQUARE_VERSION = "2024-10-17";

// Creates a pending appointment and a Square hosted payment link for the deposit.
export const createSquareDepositCheckout = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    bookingInput.extend({ origin: z.string().url().max(500), slug: z.string().min(1).max(120) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { data: settings } = await supabaseAdmin
      .from("workspace_payment_settings")
      .select("provider, connection_status, deposit_type, deposit_amount_cents, deposit_percent, currency")
      .eq("workspace_id", data.workspaceId)
      .maybeSingle();
    if (
      !settings ||
      settings.provider !== "square" ||
      settings.connection_status !== "connected" ||
      settings.deposit_type === "none"
    ) {
      throw new Error("This business isn't set up to collect deposits via card.");
    }

    const { data: creds } = await supabaseAdmin
      .from("workspace_payment_credentials")
      .select("square_access_token, square_location_id, environment")
      .eq("workspace_id", data.workspaceId)
      .maybeSingle();
    const token = creds?.square_access_token;
    const locationId = creds?.square_location_id;
    if (!token || !locationId) {
      throw new Error("This business hasn't finished connecting its payment account.");
    }

    const inserted = await prepareAndInsertAppointment(data, "pending");
    const currency = (settings.currency || inserted.service.currency || "USD").toUpperCase();
    const depositCents = computeDepositCents(inserted.basePriceCents, {
      depositType: inserted.requirePrepay ? "full" : settings.deposit_type,
      depositAmountCents: Number(settings.deposit_amount_cents ?? 0),
      depositPercent: Number(settings.deposit_percent ?? 0),
    });
    if (depositCents < 1) throw new Error("The configured deposit amount is too small to charge.");

    const origin = data.origin.replace(/\/$/, "");
    const redirectUrl = `${origin}/booking/${data.slug}?appt=${inserted.appointmentId}&square_order=${inserted.appointmentId}`;
    const label =
      settings.deposit_type === "full"
        ? `${inserted.service.name}`
        : `Deposit — ${inserted.service.name}`;

    const base = squareApiBase(creds?.environment);
    const res = await fetch(`${base}/v2/online-checkout/payment-links`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "Square-Version": SQUARE_VERSION,
      },
      body: JSON.stringify({
        idempotency_key: `dep-${inserted.appointmentId}`,
        order: {
          location_id: locationId,
          reference_id: inserted.appointmentId,
          line_items: [
            {
              name: label,
              quantity: "1",
              base_price_money: { amount: depositCents, currency },
            },
          ],
        },
        checkout_options: {
          redirect_url: redirectUrl,
          ask_for_shipping_address: false,
        },
        payment_note: `Booking ${inserted.appointmentId}`,
      }),
    });
    const json = (await res.json().catch(() => ({}))) as {
      payment_link?: { url?: string; order_id?: string };
      errors?: { detail?: string }[];
    };
    if (!res.ok || !json.payment_link?.url) {
      await supabaseAdmin.from("appointments").delete().eq("id", inserted.appointmentId);
      throw new Error(json.errors?.[0]?.detail || "Could not start checkout. Please try again.");
    }

    // Persist the Square order id so confirmation can look it up directly
    // instead of scanning the location's recent orders.
    if (json.payment_link.order_id) {
      await supabaseAdmin
        .from("appointments")
        .update({ square_order_id: json.payment_link.order_id })
        .eq("id", inserted.appointmentId);
    }

    return { url: json.payment_link.url, appointmentId: inserted.appointmentId, depositCents };
  });

// Verifies a paid Square order and confirms the pending appointment.
export const confirmSquareDepositBooking = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ appointmentId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }) => {
    const { data: appt } = await supabaseAdmin
      .from("appointments")
      .select("id, workspace_id, status, start_at, end_at, deposit_cents, square_order_id")
      .eq("id", data.appointmentId)
      .maybeSingle();
    if (!appt) throw new Error("Booking not found.");
    if (appt.status === "confirmed") return { ok: true, start_at: appt.start_at, end_at: appt.end_at };

    const { data: creds } = await supabaseAdmin
      .from("workspace_payment_credentials")
      .select("square_access_token, square_location_id, environment")
      .eq("workspace_id", appt.workspace_id)
      .maybeSingle();
    const token = creds?.square_access_token;
    const locationId = creds?.square_location_id;
    if (!token || !locationId) throw new Error("Payment account unavailable.");

    const base = squareApiBase(creds?.environment);
    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Square-Version": SQUARE_VERSION,
    };

    type SquareOrder = {
      id: string;
      reference_id?: string;
      state?: string;
      net_amount_due_money?: { amount?: number };
      total_money?: { amount?: number };
    };

    let order: SquareOrder | undefined;

    if (appt.square_order_id) {
      // Preferred path: retrieve the exact order we created for this booking.
      const res = await fetch(`${base}/v2/orders/${appt.square_order_id}`, { headers });
      const json = (await res.json().catch(() => ({}))) as {
        order?: SquareOrder;
        errors?: { detail?: string }[];
      };
      if (!res.ok) throw new Error(json.errors?.[0]?.detail || "Could not verify payment.");
      order = json.order;
    } else {
      // Fallback for legacy rows without a stored order id: scan recent orders
      // and match on the reference_id we set when creating the link.
      const res = await fetch(`${base}/v2/orders/search`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          location_ids: [locationId],
          query: { filter: { state_filter: { states: ["COMPLETED", "OPEN"] } } },
          limit: 100,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        orders?: SquareOrder[];
        errors?: { detail?: string }[];
      };
      if (!res.ok) throw new Error(json.errors?.[0]?.detail || "Could not verify payment.");
      order = (json.orders ?? []).find((o) => o.reference_id === data.appointmentId);
    }

    if (!order) throw new Error("Your deposit hasn't been received yet. Please complete payment.");
    const paid = order.state === "COMPLETED" || (order.net_amount_due_money?.amount ?? 1) === 0;
    if (!paid) {
      throw new Error("Your deposit hasn't been received yet. Please complete payment.");
    }

    // Guard against under-/tampered payments: the order total must cover the
    // deposit we expected for this appointment.
    const expected = Number(appt.deposit_cents ?? 0);
    const orderTotal = Number(order.total_money?.amount ?? 0);
    if (expected > 0 && orderTotal < expected) {
      throw new Error("Your deposit hasn't been received yet. Please complete payment.");
    }

    const { error: updErr } = await supabaseAdmin
      .from("appointments")
      .update({ status: "confirmed" })
      .eq("id", data.appointmentId);
    if (updErr) throw new Error(updErr.message);

    try {
      const { sendAppointmentEmails } = await import("@/lib/email/appointment-emails.server");
      await sendAppointmentEmails(data.appointmentId);
    } catch (e) {
      console.error("[confirmSquareDepositBooking] email dispatch failed", e);
    }

    return { ok: true, start_at: appt.start_at, end_at: appt.end_at };
  });
