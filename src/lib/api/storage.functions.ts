import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Returns a signed upload URL for the host to PUT a photo directly to storage.
 * The path is namespaced under the user's id (matches storage RLS).
 */
export const getUploadUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ filename: z.string().min(1).max(120) }).parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const safe = data.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${userId}/${crypto.randomUUID()}-${safe}`;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed, error } = await supabaseAdmin.storage
      .from("property-photos")
      .createSignedUploadUrl(path);
    if (error) throw new Error(error.message);
    return { path, token: signed.token, signedUrl: signed.signedUrl };
  });

export const signImageUrls = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ paths: z.array(z.string().max(500)).max(30) }).parse(d))
  .handler(async ({ data }) => {
    if (!data.paths.length) return { urls: {} as Record<string, string> };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed } = await supabaseAdmin.storage
      .from("property-photos")
      .createSignedUrls(data.paths, 60 * 60 * 6);
    const urls: Record<string, string> = {};
    signed?.forEach((s, i) => {
      if (s.signedUrl) urls[data.paths[i]] = s.signedUrl;
    });
    return { urls };
  });
