export type ThemeConfig = {
  primary_color: string;
  background_color: string;
  card_style: "rounded" | "sharp" | "soft";
  font_family: "sans" | "serif" | "mono";
  layout_mode: "clean" | "compact" | "editorial";
  hero_text: string;
};

export const DEFAULT_THEME: ThemeConfig = {
  primary_color: "#4f46e5",
  background_color: "#ffffff",
  card_style: "rounded",
  font_family: "sans",
  layout_mode: "clean",
  hero_text: "Book an Appointment",
};

export function normalizeTheme(input: unknown): ThemeConfig {
  const t = (input ?? {}) as Partial<ThemeConfig>;
  return { ...DEFAULT_THEME, ...t };
}

export function fontClass(f: ThemeConfig["font_family"]) {
  return f === "serif" ? "font-serif" : f === "mono" ? "font-mono" : "font-sans";
}

export function cardRadius(c: ThemeConfig["card_style"]) {
  return c === "sharp" ? "rounded-none" : c === "soft" ? "rounded-xl" : "rounded-3xl";
}

export function layoutPadding(l: ThemeConfig["layout_mode"]) {
  if (l === "compact") return { page: "py-6 sm:py-8", card: "p-4 sm:p-5", gap: "space-y-2" };
  if (l === "editorial") return { page: "py-16 sm:py-24", card: "p-8 sm:p-12", gap: "space-y-5" };
  return { page: "py-10 sm:py-16", card: "p-6 sm:p-8", gap: "space-y-3" };
}

// Heuristic AI mock: maps keywords in the prompt to a theme.
export function generateThemeFromPrompt(prompt: string): ThemeConfig {
  const p = prompt.toLowerCase();
  const has = (...words: string[]) => words.some((w) => p.includes(w));

  let primary = DEFAULT_THEME.primary_color;
  let background = DEFAULT_THEME.background_color;
  let font: ThemeConfig["font_family"] = "sans";
  let card: ThemeConfig["card_style"] = "rounded";
  let layout: ThemeConfig["layout_mode"] = "clean";
  let hero = DEFAULT_THEME.hero_text;

  // Palette
  if (has("dark", "midnight", "noir", "black")) { primary = "#a78bfa"; background = "#0b0b12"; }
  else if (has("earthy", "forest", "sage", "olive", "green", "wellness", "natural")) { primary = "#4d7c4a"; background = "#f7f4ec"; }
  else if (has("pink", "rose", "blush", "feminine", "romantic")) { primary = "#e94f8a"; background = "#fff5f8"; }
  else if (has("ocean", "blue", "calm", "marine", "sea")) { primary = "#0c6fb8"; background = "#f1f7fb"; }
  else if (has("warm", "sand", "terracotta", "clay", "desert", "cozy")) { primary = "#b1542b"; background = "#fbf5ee"; }
  else if (has("luxury", "gold", "elegant", "premium")) { primary = "#b8893a"; background = "#0f0f0f"; }
  else if (has("vibrant", "neon", "bold", "playful")) { primary = "#ff5722"; background = "#fffaf2"; }
  else if (has("mono", "minimal", "swiss", "monochrome")) { primary = "#111111"; background = "#ffffff"; }

  // Typography
  if (has("serif", "editorial", "magazine", "elegant", "classic", "luxury")) font = "serif";
  else if (has("mono", "code", "techy", "developer", "terminal")) font = "mono";
  else font = "sans";

  // Card style
  if (has("sharp", "brutal", "boxy", "swiss")) card = "sharp";
  else if (has("soft", "subtle", "gentle")) card = "soft";
  else card = "rounded";

  // Layout
  if (has("compact", "dense", "efficient", "tight")) layout = "compact";
  else if (has("editorial", "spacious", "airy", "magazine", "luxury")) layout = "editorial";
  else layout = "clean";

  // Hero text guess
  if (has("wellness", "spa", "massage")) hero = "Reserve your moment of calm";
  else if (has("salon", "barber", "hair", "beauty")) hero = "Book your next look";
  else if (has("coach", "consult", "advisor")) hero = "Schedule a session";
  else if (has("studio", "fitness", "yoga")) hero = "Reserve your spot";

  return {
    primary_color: primary,
    background_color: background,
    card_style: card,
    font_family: font,
    layout_mode: layout,
    hero_text: hero,
  };
}
