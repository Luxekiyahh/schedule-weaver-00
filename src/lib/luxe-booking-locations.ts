export const LUXE_STUDIO_LOCATIONS = [
  { id: "studio", city: "Kissimmee", address: "Kissimmee, FL 34758" },
  { id: "lakeland", city: "Lakeland", address: "Lakeland, FL 33813" },
] as const;

export type LuxeLocationMode = typeof LUXE_STUDIO_LOCATIONS[number]["id"] | "travel";

export function luxeLocationNote(mode: LuxeLocationMode, travelAddress: string) {
  if (mode === "travel") return `Location: on location at ${travelAddress.trim()}`;
  const studio = LUXE_STUDIO_LOCATIONS.find((location) => location.id === mode);
  return `Location: at the studio, ${studio?.address ?? ""}`;
}