import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { fetchSirvoyRooms } from "./sirvoy.server";
import { fetchHotelDruidRooms } from "./hoteldruid.server";
import { getRateToKes, refreshCoreRates } from "./fx.server";

export async function runSirvoySync() {
  const { data: run } = await supabaseAdmin
    .from("sync_runs")
    .insert({ source: "sirvoy", status: "running" })
    .select()
    .single();
  try {
    const rooms = await fetchSirvoyRooms();
    let n = 0;
    for (const r of rooms) {
      const rate = await getRateToKes(r.currency);
      const price_kes = Math.round(r.price * rate);
      await supabaseAdmin.from("external_listings").upsert(
        {
          source: "sirvoy",
          external_id: r.external_id,
          hotel_name: r.hotel_name,
          room_type: r.room_type,
          city: r.city,
          price_native: r.price,
          currency: r.currency,
          price_kes,
          availability: r.availability,
          booking_status: r.booking_status,
          raw: r as any,
          synced_at: new Date().toISOString(),
        },
        { onConflict: "source,external_id" },
      );
      n++;
    }
    await supabaseAdmin
      .from("sync_runs")
      .update({ status: "success", items_upserted: n, finished_at: new Date().toISOString() })
      .eq("id", run!.id);
    return { source: "sirvoy" as const, items: n };
  } catch (e: any) {
    await supabaseAdmin
      .from("sync_runs")
      .update({ status: "error", error: String(e?.message ?? e), finished_at: new Date().toISOString() })
      .eq("id", run!.id);
    throw e;
  }
}

export async function runHotelDruidSync() {
  const { data: run } = await supabaseAdmin
    .from("sync_runs")
    .insert({ source: "hoteldruid", status: "running" })
    .select()
    .single();
  try {
    const rooms = await fetchHotelDruidRooms();
    let n = 0;
    for (const r of rooms) {
      await supabaseAdmin.from("external_listings").upsert(
        {
          source: "hoteldruid",
          external_id: r.external_id,
          hotel_name: r.hotel_name,
          room_type: r.room_type,
          city: r.city,
          price_native: r.price_kes,
          currency: "KES",
          price_kes: r.price_kes,
          availability: r.availability,
          booking_status: r.booking_status,
          raw: r as any,
          synced_at: new Date().toISOString(),
        },
        { onConflict: "source,external_id" },
      );
      n++;
    }
    await supabaseAdmin
      .from("sync_runs")
      .update({ status: "success", items_upserted: n, finished_at: new Date().toISOString() })
      .eq("id", run!.id);
    return { source: "hoteldruid" as const, items: n };
  } catch (e: any) {
    await supabaseAdmin
      .from("sync_runs")
      .update({ status: "error", error: String(e?.message ?? e), finished_at: new Date().toISOString() })
      .eq("id", run!.id);
    throw e;
  }
}

export async function runAllSyncs() {
  await refreshCoreRates();
  const results = await Promise.allSettled([runSirvoySync(), runHotelDruidSync()]);
  return results.map((r) => (r.status === "fulfilled" ? r.value : { error: String((r as any).reason) }));
}
