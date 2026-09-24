const LOCATION_LINE = /^Location:\s*(.+)$/im;

export function resolveAppointmentLocation(
  notes: string | null | undefined,
  studioLocation: string | null | undefined,
): { location: string; notes: string } {
  const rawNotes = notes ?? "";
  const match = LOCATION_LINE.exec(rawNotes);

  if (!match) {
    return { location: studioLocation?.trim() ?? "", notes: rawNotes.trim() };
  }

  const locationChoice = match[1].trim();
  const travelPrefix = "on location at ";
  const isTravel = locationChoice.toLowerCase().startsWith(travelPrefix);
  const location = isTravel
    ? locationChoice.slice(travelPrefix.length).trim()
    : studioLocation?.trim() ?? "";

  return {
    location,
    notes: rawNotes.replace(match[0], "").replace(/^\s+/, "").trim(),
  };
}