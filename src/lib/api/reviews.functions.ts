import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const createReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      property_id: z.string().uuid(),
      rating: z.number().int().min(1).max(5),
      comment: z.string().max(1000).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("reviews")
      .upsert(
        { property_id: data.property_id, guest_id: userId, rating: data.rating, comment: data.comment ?? null },
        { onConflict: "property_id,guest_id" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });
