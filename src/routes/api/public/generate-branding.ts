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

const brandingSchema = z.object({
  primary_color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  secondary_color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  background_color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  font_family: z.string().min(1).max(60),
  hero_headline: z.string().min(2).max(120),
  hero_subheading: z.string().min(2).max(240),
  card_style: z.enum(["sharp", "rounded", "hyper-rounded"]),
});

type Branding = z.infer<typeof brandingSchema>;

const SYSTEM_PROMPT = `You are a senior brand designer for service businesses (salons, studios, spas, clinics).
Translate a one-line brief into a complete visual identity for a public booking storefront.

Return ONLY a valid JSON object — no prose, no markdown, no code fences — matching exactly this shape:
{
  "primary_color": "#RRGGBB",
  "secondary_color": "#RRGGBB",
  "background_color": "#RRGGBB",
  "font_family": "<one of: ${FONT_CHOICES.join(", ")}>",
  "hero_headline": "3-8 punchy brand-forward words",
  "hero_subheading": "1 warm sentence specific to the brief",
  "card_style": "sharp" | "rounded" | "hyper-rounded"
}

Rules:
- Colors must contrast: background must read against primary text; primary is for CTAs.
- font_family must be exactly one of the allow-list values (case-sensitive).
- Match the vibe of the brief (moody/dark → near-black bg + saturated accent; soft luxury → cream/pink; earthy → warm naturals).
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
        try {
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
              model: "claude-3-5-sonnet-20241022",
              max_tokens: 1024,
              system: SYSTEM_PROMPT,
              messages: [{ role: "user", content: parsedBody.prompt }],
            }),
          }).finally(() => clearTimeout(timeoutId));

          if (!resp.ok) {
            const txt = await resp.text();
            console.error("Anthropic error", resp.status, txt);
            throw new Error("upstream");
          }

          const json = (await resp.json()) as {
            content?: Array<{ type: string; text?: string }>;
          };
          const raw = json.content?.find((c) => c.type === "text")?.text ?? "";
          const cleaned = raw
            .trim()
            .replace(/^```(?:json)?\s*/i, "")
            .replace(/```\s*$/i, "")
            .trim();
          const parsed = JSON.parse(cleaned);
          branding = brandingSchema.parse(parsed);
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
            layout_config: { card_style: branding.card_style },
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
