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
    if (!ws) return { workspace: null, services: [], providers: [], serviceProviders: [] };

    const [{ data: services }, { data: members }, { data: links }] = await Promise.all([
      supabaseAdmin
        .from("services")
        .select("id, name, description, duration_minutes, price_cents, currency")
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

    return {
      workspace: ws,
      services: services ?? [],
      providers,
      serviceProviders: links ?? [],
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

export const createBooking = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({
      workspaceId: z.string().uuid(),
      serviceId: z.string().uuid(),
      providerMemberId: z.string().uuid(),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      time: z.string().regex(/^\d{2}:\d{2}$/),
      firstName: z.string().trim().min(1).max(80),
      lastName: z.string().trim().min(1).max(80),
      email: z.string().trim().email().max(255),
      notes: z.string().trim().max(1000).optional().default(""),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    // Get service for duration
    const { data: svc, error: svcErr } = await supabaseAdmin
      .from("services")
      .select("id, duration_minutes, workspace_id, is_active")
      .eq("id", data.serviceId)
      .eq("workspace_id", data.workspaceId)
      .maybeSingle();
    if (svcErr) throw new Error(svcErr.message);
    if (!svc || !svc.is_active) throw new Error("Service unavailable");

    const startIso = new Date(`${data.date}T${data.time}:00`).toISOString();
    const endIso = new Date(new Date(startIso).getTime() + svc.duration_minutes * 60000).toISOString();

    // Conflict re-check
    const { data: conflict } = await supabaseAdmin
      .from("appointments")
      .select("id")
      .eq("workspace_id", data.workspaceId)
      .eq("provider_id", data.providerMemberId)
      .neq("status", "cancelled")
      .lt("start_at", endIso)
      .gt("end_at", startIso)
      .limit(1);
    if (conflict && conflict.length) throw new Error("That time was just booked. Please pick another slot.");

    // Find or create customer (by email within workspace)
    const fullName = `${data.firstName} ${data.lastName}`.trim();
    const { data: existing } = await supabaseAdmin
      .from("customers")
      .select("id")
      .eq("workspace_id", data.workspaceId)
      .eq("email", data.email)
      .maybeSingle();

    let customerId = existing?.id as string | undefined;
    if (!customerId) {
      const { data: ins, error: insErr } = await supabaseAdmin
        .from("customers")
        .insert({
          workspace_id: data.workspaceId,
          full_name: fullName,
          email: data.email,
        })
        .select("id")
        .single();
      if (insErr) throw new Error(insErr.message);
      customerId = ins.id;
    }

    const { error: apptErr } = await supabaseAdmin.from("appointments").insert({
      workspace_id: data.workspaceId,
      service_id: data.serviceId,
      provider_id: data.providerMemberId,
      customer_id: customerId,
      start_at: startIso,
      end_at: endIso,
      status: "confirmed",
      notes: data.notes || null,
    });
    if (apptErr) throw new Error(apptErr.message);

    return { ok: true, start_at: startIso, end_at: endIso };
  });
