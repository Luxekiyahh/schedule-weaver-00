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

const heroSectionSchema = z.object({
  id: z.string().min(1),
  type: z.literal("hero"),
  layout_style: z.enum(["split", "centered", "editorial"]),
  headline: z.string().min(2).max(160),
  subhead: z.string().min(2).max(280),
  primary_cta_text: z.string().min(1).max(40),
  secondary_cta_text: z.string().min(1).max(40).optional().nullable(),
});

const portfolioSectionSchema = z.object({
  id: z.string().min(1),
  type: z.literal("portfolio"),
  layout_style: z.enum(["masonry", "grid"]),
  section_title: z.string().min(1).max(120),
  image_placeholders: z.array(z.string().min(1).max(80)).min(1).max(12),
});

const planTierSchema = z.object({
  name: z.string().min(1).max(60),
  price: z.string().min(1).max(40),
  features: z.array(z.string().min(1).max(120)).min(1).max(8),
});

const plansSectionSchema = z.object({
  id: z.string().min(1),
  type: z.literal("plans"),
  section_title: z.string().min(1).max(120),
  tiers: z.array(planTierSchema).min(1).max(4),
});

const sectionSchema = z.discriminatedUnion("type", [
  heroSectionSchema,
  portfolioSectionSchema,
  plansSectionSchema,
]);

const layoutConfigSchema = z.object({
  card_style: z
    .enum(["sharp", "rounded", "hyper-rounded", "hyper_rounded"])
    .transform((v) => (v === "hyper_rounded" ? "hyper-rounded" : v)),
  sections: z.array(sectionSchema).min(1).max(6),
});

const brandingSchema = z.object({
  primary_hex: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  accent_hex: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  background_hex: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  heading_font: z.string().min(1).max(60),
  body_font: z.string().min(1).max(60),
  layout_config: layoutConfigSchema,
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

const SYSTEM_PROMPT = `You are a principal product designer for premium service businesses (salons, studios, spas, clinics).
Translate a one-line brief into an ultra-premium, conversion-optimized, SECTION-DRIVEN storefront layout.

Return ONLY a valid JSON object — no prose, no markdown, no code fences — matching exactly this shape:
{
  "primary_hex": "#RRGGBB",
  "accent_hex": "#RRGGBB",
  "background_hex": "#RRGGBB",
  "heading_font": "<one of: ${FONT_CHOICES.join(", ")}>",
  "body_font": "<one of: ${FONT_CHOICES.join(", ")}>",
  "layout_config": {
    "card_style": "sharp" | "rounded" | "hyper-rounded",
    "sections": [
      {
        "id": "hero_section",
        "type": "hero",
        "layout_style": "split" | "centered" | "editorial",
        "headline": "3-8 punchy brand-forward words",
        "subhead": "1 warm marketing sentence specific to the brief",
        "primary_cta_text": "Book Appointment",
        "secondary_cta_text": "Explore Gallery"
      },
      {
        "id": "portfolio_section",
        "type": "portfolio",
        "layout_style": "masonry" | "grid",
        "section_title": "Our Masterpieces",
        "image_placeholders": ["short-descriptive-slug-1", "short-descriptive-slug-2", "short-descriptive-slug-3", "short-descriptive-slug-4"]
      },
      {
        "id": "packages_section",
        "type": "plans",
        "section_title": "Exclusive Packages & VIP Tiers",
        "tiers": [
          { "name": "Essential Care", "price": "$120", "features": ["Feature one", "Feature two"] },
          { "name": "Signature", "price": "$260", "features": ["Feature one", "Feature two", "Feature three"] },
          { "name": "The Luxury Install", "price": "$450+", "features": ["Premium feature", "Premium feature", "Priority access"] }
        ]
      }
    ]
  }
}

Rules:
- Output sections in this exact order: hero, portfolio, plans. Always include all three.
- Fonts must be exactly from the allow-list (case-sensitive). Pair an expressive heading font with a refined body font.
- Colors must contrast: background must read against text; primary is for CTAs and headings.
- Match the vibe: moody/dark → near-black bg + saturated accent + "editorial" hero + "sharp" cards; soft luxury → cream/pink + "centered" hero + "hyper-rounded" cards; clean modern → white/neutral + "split" hero + "rounded".
- Portfolio: use "masonry" for visual/lifestyle brands (hair, nails, tattoo, photography), "grid" for clinical/professional. image_placeholders: 4-6 short kebab-case descriptive slugs that imply the brand.
- Plans: always return exactly 3 tiers, ascending price, concise feature bullets (max ~6 words each).
- All copy must feel brand-specific to the brief — never generic.
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
