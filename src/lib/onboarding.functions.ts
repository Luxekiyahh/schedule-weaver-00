import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const checkSlugAvailable = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        slug: z
          .string()
          .min(2)
          .max(48)
          .regex(/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/),
        excludeWorkspaceId: z.string().uuid().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    let q = supabaseAdmin
      .from("workspaces")
      .select("id", { count: "exact", head: true })
      .eq("slug", data.slug);
    if (data.excludeWorkspaceId) q = q.neq("id", data.excludeWorkspaceId);
    const { count, error } = await q;
    if (error) throw new Error(error.message);
    return { available: (count ?? 0) === 0 };
  });
