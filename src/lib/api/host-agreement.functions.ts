import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const HOST_AGREEMENT_VERSION = "v1";

export const myHostAgreement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("host_agreements")
      .select("id,version,accepted_at")
      .eq("user_id", context.userId)
      .eq("version", HOST_AGREEMENT_VERSION)
      .maybeSingle();
    return { accepted: !!data, acceptedAt: data?.accepted_at ?? null };
  });

export const acceptHostAgreement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ userAgent: z.string().max(400).optional() }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("host_agreements").insert({
      user_id: context.userId,
      version: HOST_AGREEMENT_VERSION,
      user_agent: data.userAgent ?? null,
    });
    if (error && !error.message.includes("duplicate")) throw new Error(error.message);
    return { ok: true };
  });
