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

const HD_THUMBS = [
  "https://images.unsplash.com/photo-1590523278191-995cbcda646b?auto=format&fit=crop&w=800&q=70",
  "https://images.unsplash.com/photo-1523805009345-7448845a9e53?auto=format&fit=crop&w=800&q=70",
  "https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=800&q=70",
  "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=800&q=70",
  "https://images.unsplash.com/photo-1549366021-9f761d450615?auto=format&fit=crop&w=800&q=70",
  "https://images.unsplash.com/photo-1568084680786-a84f91d1153c?auto=format&fit=crop&w=800&q=70",
];

export const listHotelDruidFeatured = createServerFn({ method: "GET" })
  .handler(async () => {
    const { fetchHotelDruidRooms } = await import("@/lib/sync/hoteldruid.server");
    const rooms = await fetchHotelDruidRooms();
    return rooms.map((r, i) => ({
      external_id: r.external_id,
      hotel_name: r.hotel_name,
      room_type: r.room_type,
      city: r.city,
      price_kes: r.price_kes,
      booking_status: r.booking_status,
      thumbnail: HD_THUMBS[i % HD_THUMBS.length],
    }));
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
