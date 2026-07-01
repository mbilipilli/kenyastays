import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function requireAdmin(supabase: any, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!data) throw new Error("Forbidden");
}

export const runSync = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ source: z.enum(["sirvoy", "hoteldruid", "all"]).default("all") }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { runSirvoySync, runHotelDruidSync, runAllSyncs } = await import("@/lib/sync/run.server");
    if (data.source === "sirvoy") return [await runSirvoySync()];
    if (data.source === "hoteldruid") return [await runHotelDruidSync()];
    return await runAllSyncs();
  });

export const getSyncStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: runs } = await supabaseAdmin
      .from("sync_runs")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(20);
    const { data: counts } = await supabaseAdmin
      .from("external_listings")
      .select("source,synced_at");
    const bySource: Record<string, { count: number; last: string | null }> = {
      sirvoy: { count: 0, last: null },
      hoteldruid: { count: 0, last: null },
    };
    counts?.forEach((r: any) => {
      const s = bySource[r.source];
      if (!s) return;
      s.count++;
      if (!s.last || r.synced_at > s.last) s.last = r.synced_at;
    });
    return { runs: runs ?? [], sources: bySource };
  });

export const listExternalListings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("external_listings")
      .select("*")
      .order("synced_at", { ascending: false })
      .limit(200);
    return data ?? [];
  });
