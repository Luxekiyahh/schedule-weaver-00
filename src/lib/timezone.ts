/**
 * Timezone helpers for converting between a workspace's local wall-clock
 * time (what tenants and customers see) and absolute UTC instants (what we
 * store in `appointments.start_at` / `end_at`).
 *
 * The server runtime is always UTC, so `new Date("2026-08-10T14:00:00")`
 * silently means 14:00 UTC — four/five hours off for a New York salon.
 * Always route wall-clock times through `zonedTimeToUtc`.
 */

const OFFSET_FORMATTERS = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let fmt = OFFSET_FORMATTERS.get(timeZone);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    OFFSET_FORMATTERS.set(timeZone, fmt);
  }
  return fmt;
}

/** Milliseconds to add to a UTC instant to get the wall-clock time in `timeZone`. */
export function tzOffsetMs(instant: Date, timeZone: string): number {
  try {
    const parts = formatterFor(timeZone).formatToParts(instant);
    const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? "0");
    const asUtc = Date.UTC(
      get("year"),
      get("month") - 1,
      get("day"),
      get("hour") % 24,
      get("minute"),
      get("second"),
    );
    return asUtc - instant.getTime();
  } catch {
    return 0; // unknown timezone → treat as UTC
  }
}

/**
 * Convert a wall-clock date + time in `timeZone` into a UTC Date.
 * `date` is `YYYY-MM-DD`, `time` is `HH:mm` (or `HH:mm:ss`).
 */
export function zonedTimeToUtc(date: string, time: string, timeZone: string): Date {
  const [h = "0", m = "0", s = "0"] = time.split(":");
  const naive = Date.parse(
    `${date}T${h.padStart(2, "0")}:${m.padStart(2, "0")}:${s.padStart(2, "0")}Z`,
  );
  // Two passes handle DST boundaries where the offset differs before/after.
  let utc = naive - tzOffsetMs(new Date(naive), timeZone);
  utc = naive - tzOffsetMs(new Date(utc), timeZone);
  return new Date(utc);
}

/** Wall-clock `YYYY-MM-DD` for an instant in `timeZone`. */
export function utcToZonedDateString(instant: Date, timeZone: string): string {
  return new Date(instant.getTime() + tzOffsetMs(instant, timeZone)).toISOString().slice(0, 10);
}

/** Minutes since midnight in `timeZone` for an instant. */
export function utcToZonedMinutes(instant: Date, timeZone: string): number {
  const local = new Date(instant.getTime() + tzOffsetMs(instant, timeZone));
  return local.getUTCHours() * 60 + local.getUTCMinutes();
}
