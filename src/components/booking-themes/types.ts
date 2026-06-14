import type { CSSProperties } from "react";

export type StorefrontWorkspace = {
  id: string;
  name: string;
  slug: string;
  theme_id: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  font_family: string | null;
  logo_url: string | null;
};

export type Category = {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
};

export type Variant = {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  price_cents: number;
  duration_min: number;
  sort_order: number;
};

export type LengthOption = {
  id: string;
  name: string;
  duration_min: number;
  price_cents: number;
  sort_order: number;
};

/**
 * Unified prop contract shared by every storefront skin. Each layout receives
 * the same catalog data and resolved branding tokens, so swapping skins never
 * changes the data pipeline.
 */
export type StorefrontThemeProps = {
  workspace: StorefrontWorkspace;
  categories: Category[];
  variants: Variant[];
  lengthOptions: LengthOption[];
  slug: string;
  /** Resolved branding tokens (with fallbacks already applied). */
  primary: string;
  secondary: string;
  fontStack?: string;
};

export function money(cents: number) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(cents / 100);
}

export function fontFamilyStack(font?: string | null): string | undefined {
  if (!font) return undefined;
  return `'${font}', system-ui, sans-serif`;
}

export type ThemeVars = CSSProperties & Record<string, string | undefined>;
