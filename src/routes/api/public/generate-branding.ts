import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createClient } from "@supabase/supabase-js";

const FONT_CHOICES = [
  "Playfair Display",
  "Inter",
  "Montserrat",
  "Cormorant Garamond",
  "DM Serif Display",
  "Space Grotesk",
  "Bebas Neue",
  "Lora",
  "Manrope",
  "Archivo Black",
] as const;

const bodySchema = z.object({
  prompt: z.string().trim().min(8).max(2000),
});

const uiTokensSchema = z.object({
  card_layout_style: z.enum(["bento-grid", "editorial-stack", "modern-minimalist"]),
  border_radius_class: z.enum(["rounded-none", "rounded-xl", "rounded-full"]),
  shadow_intensity_class: z.enum(["shadow-none", "shadow-sm", "shadow-xl"]),
  glassmorphism_enabled: z.boolean(),
  button_hover_animation: z.enum(["scale-up", "glow-border", "slide-shimmer"]),
  spacing_density: z.enum(["compact", "spacious", "elegant-relaxed"]),
});

const heroVisualsSchema = z.object({
  layout_alignment: z.enum(["left-split", "center-column"]),
  headline_text: z.string().min(2).max(160),
  subheadline_text: z.string().min(2).max(280),
});

const brandingSchema = z.object({
  primary_hex: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  accent_hex: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  background_hex: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  card_background_hex: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  heading_font: z.string().min(1).max(60),
  body_font: z.string().min(1).max(60),
  ui_tokens: uiTokensSchema,
  hero_visuals: heroVisualsSchema,
});

type Branding = z.infer<typeof brandingSchema>;

function extractJsonObject(raw: string): unknown {
  let cleaned = raw
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No JSON object found in response");
  }
  cleaned = cleaned.substring(start, end + 1);
  try {
    return JSON.parse(cleaned);
  } catch {
    const repaired = cleaned
      .replace(/,\s*}/g, "}")
      .replace(/,\s*]/g, "]")
      // eslint-disable-next-line no-control-regex
      .replace(/[\x00-\x1F\x7F]/g, "");
    return JSON.parse(repaired);
  }
}

const SYSTEM_PROMPT = `You are an elite frontend designer specializing in modern web aesthetics (Bento grid systems, minimal luxury layouts, glassmorphic UI, and fluid animations). Analyze the provider's aesthetic vibe prompt and generate a design system token JSON. Do not return markdown, backticks, or text.

You are STRICTLY a visual styling engine. Do NOT invent services, prices, packages, portfolio items, or business copy beyond the hero headline/subheadline. The provider already manages their own services, categories, and add-ons in the database; your output only wraps that real content in a beautiful design system.

Schema:
{
  "primary_hex": "#hex (main branding accents & primary buttons)",
  "accent_hex": "#hex (tag badges, highlights, secondary buttons)",
  "background_hex": "#hex (full canvas backdrop)",
  "card_background_hex": "#hex (content container wrappers)",
  "heading_font": "Google Font Name (e.g., Syne, Playfair Display, Space Grotesk, Inter)",
  "body_font": "Google Font Name (e.g., Inter, DM Sans, Plus Jakarta Sans)",
  "ui_tokens": {
    "card_layout_style": "bento-grid | editorial-stack | modern-minimalist",
    "border_radius_class": "rounded-none | rounded-xl | rounded-full",
    "shadow_intensity_class": "shadow-none | shadow-sm | shadow-xl",
    "glassmorphism_enabled": true | false,
    "button_hover_animation": "scale-up | glow-border | slide-shimmer",
    "spacing_density": "compact | spacious | elegant-relaxed"
  },
  "hero_visuals": {
    "layout_alignment": "left-split | center-column",
    "headline_text": "A beautifully styled marketing headline matching their aesthetic",
    "subheadline_text": "A clean, supportive tagline wrapper"
  }
}

Rules:
- Output ONLY the raw JSON object. No prose, no markdown, no code fences.
- Use valid Google Font names exactly as they appear on fonts.google.com.
- card_background_hex must subtly differ from background_hex to create elevation; both must support legible text.
- All hex colors must produce accessible contrast; primary_hex is reserved for CTAs.
- Match the vibe holistically: moody/dark luxury → near-black bg + saturated accent + "editorial-stack" + "shadow-xl" + glassmorphism true; soft pastel → cream/pink + "modern-minimalist" + "rounded-full" + "shadow-sm"; bold modern → "bento-grid" + "rounded-xl" + "scale-up".
- glassmorphism_enabled true works best on darker or vivid backgrounds; avoid on flat white.
- hero_visuals copy must feel brand-specific — short, evocative, never generic boilerplate.
`;

export const Route = createFileRoute("/api/public/generate-branding")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // 1. Auth
        const authHeader = request.headers.get("authorization") ?? "";
        const token = authHeader.toLowerCase().startsWith("bearer ")
          ? authHeader.slice(7).trim()
          : "";
        if (!token) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }
        const supabaseUrl = process.env.SUPABASE_URL!;
        const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY!;
        const userClient = createClient(supabaseUrl, publishableKey, {
          global: { headers: { Authorization: `Bearer ${token}` } },
        });
        const { data: userData, error: userErr } = await userClient.auth.getUser();
        if (userErr || !userData?.user) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }
        const userId = userData.user.id;

        // 2. Validate input
        let parsedBody: z.infer<typeof bodySchema>;
        try {
          parsedBody = bodySchema.parse(await request.json());
        } catch {
          return Response.json({ error: "Invalid input" }, { status: 400 });
        }

        // 3. Find workspace
        const { data: ws } = await supabaseAdmin
          .from("workspaces")
          .select("id, ai_credits")
          .eq("owner_id", userId)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();
        if (!ws) {
          return Response.json({ error: "Workspace not found" }, { status: 404 });
        }

        // 4. Consume credit atomically
        const { data: remainingRaw, error: consumeErr } = await supabaseAdmin.rpc(
          "consume_ai_credit",
          { _workspace_id: ws.id, _prompt: parsedBody.prompt },
        );
        if (consumeErr) {
          const msg = (consumeErr.message || "").toUpperCase();
          if (msg.includes("OUT_OF_CREDITS")) {
            return Response.json(
              { error: "OUT_OF_CREDITS", credits: 0 },
              { status: 402 },
            );
          }
          return Response.json({ error: "Could not consume credit" }, { status: 500 });
        }
        const remaining = typeof remainingRaw === "number" ? remainingRaw : 0;

        // 5. Call Anthropic
        const anthropicKey = process.env.ANTHROPIC_API_KEY;
        if (!anthropicKey) {
          await supabaseAdmin.rpc("refund_ai_credit", { _workspace_id: ws.id });
          return Response.json({ error: "AI not configured" }, { status: 500 });
        }

        let branding: Branding;
        let rawText = "";
        try {
          console.log("Anthropic API Key present:", !!process.env.ANTHROPIC_API_KEY);
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 25_000);
          const resp = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
              "x-api-key": anthropicKey,
              "anthropic-version": "2023-06-01",
              "content-type": "application/json",
            },
            signal: controller.signal,
            body: JSON.stringify({
              model: "claude-sonnet-4-6",
              max_tokens: 1024,
              system: SYSTEM_PROMPT,
              messages: [{ role: "user", content: parsedBody.prompt }],
            }),
          }).finally(() => clearTimeout(timeoutId));

          if (!resp.ok) {
            const errorText = await resp.text();
            console.error("Anthropic API Error Details:", resp.status, errorText);
            throw new Error("upstream");
          }

          const json = (await resp.json()) as {
            content?: Array<{ type: string; text?: string }>;
          };
          rawText = json.content?.find((c) => c.type === "text")?.text ?? "";

          try {
            const parsed = extractJsonObject(rawText);
            branding = brandingSchema.parse(parsed);
          } catch (parseErr) {
            console.error(
              "Failed to parse or validate Claude's JSON payload. Raw text received:",
              rawText,
              parseErr,
            );
            throw parseErr;
          }
        } catch (e) {
          console.error("Generation failed", e);
          await supabaseAdmin.rpc("refund_ai_credit", { _workspace_id: ws.id });
          return Response.json(
            { error: "AI generation failed. Your credit was refunded." },
            { status: 502 },
          );
        }

        // 6. Persist to workspace_branding
        const { error: upErr } = await supabaseAdmin.from("workspace_branding").upsert(
          {
            workspace_id: ws.id,
            primary_hex: branding.primary_color,
            accent_hex: branding.secondary_color,
            background_hex: branding.background_color,
            heading_font: branding.font_family,
            body_font: branding.font_family,
            hero_headline: branding.hero_headline,
            hero_subhead: branding.hero_subheading,
            layout_config: branding.layout_config,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "workspace_id" },
        );
        if (upErr) {
          console.error("Persist failed", upErr);
          // Credit already consumed; don't refund — content was generated
          return Response.json({ error: "Could not save branding" }, { status: 500 });
        }

        return Response.json({ branding, credits: remaining });
      },
    },
  },
});
