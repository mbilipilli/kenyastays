import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function requireAdmin(supabase: any, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!data) throw new Error("Forbidden");
}

export const amIAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    return { admin: !!data };
  });

export const adminOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const [{ count: active }, { count: bookingsToday }, { data: revRows }, { data: extAgg }, { data: recentBookings }] = await Promise.all([
      supabaseAdmin.from("properties").select("*", { count: "exact", head: true }).eq("is_active", true),
      supabaseAdmin.from("bookings").select("*", { count: "exact", head: true }).gte("created_at", today.toISOString()),
      supabaseAdmin.from("bookings").select("total_kes,commission_kes,status,created_at").in("status", ["confirmed", "completed"]),
      supabaseAdmin.from("external_listings").select("source,synced_at"),
      supabaseAdmin
        .from("bookings")
        .select("id,total_kes,status,created_at,check_in,check_out,properties:property_id(title,city)")
        .order("created_at", { ascending: false })
        .limit(15),
    ]);
    const totalRevenue = (revRows ?? []).reduce((s: number, r: any) => s + (r.total_kes ?? 0), 0);
    const commission = (revRows ?? []).reduce((s: number, r: any) => s + (r.commission_kes ?? 0), 0);
    const bySource: Record<string, { count: number; last: string | null }> = {
      sirvoy: { count: 0, last: null },
      hoteldruid: { count: 0, last: null },
    };
    (extAgg ?? []).forEach((r: any) => {
      const s = bySource[r.source];
      if (!s) return;
      s.count++;
      if (!s.last || r.synced_at > s.last) s.last = r.synced_at;
    });
    // Revenue by day (last 14)
    const days: Record<string, number> = {};
    for (let i = 13; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400_000).toISOString().slice(0, 10);
      days[d] = 0;
    }
    (revRows ?? []).forEach((r: any) => {
      const d = r.created_at.slice(0, 10);
      if (d in days) days[d] += r.total_kes ?? 0;
    });
    return {
      activeListings: active ?? 0,
      bookingsToday: bookingsToday ?? 0,
      totalRevenueKes: totalRevenue,
      commissionKes: commission,
      syncSources: bySource,
      recentBookings: recentBookings ?? [],
      revenueSeries: Object.entries(days).map(([date, kes]) => ({ date: date.slice(5), kes })),
    };
  });

export const listAllHosts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: hostRoles } = await supabaseAdmin.from("user_roles").select("user_id").eq("role", "host");
    const ids = (hostRoles ?? []).map((r: any) => r.user_id);
    if (!ids.length) return [];
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id,full_name,avatar_url,phone,is_verified,created_at")
      .in("id", ids);
    const { data: counts } = await supabaseAdmin.from("properties").select("host_id").in("host_id", ids);
    const listingByHost: Record<string, number> = {};
    counts?.forEach((r: any) => (listingByHost[r.host_id] = (listingByHost[r.host_id] ?? 0) + 1));
    return (profiles ?? []).map((p: any) => ({ ...p, listing_count: listingByHost[p.id] ?? 0 }));
  });

export const setHostVerified = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ user_id: z.string().uuid(), verified: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("profiles").update({ is_verified: data.verified }).eq("id", data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const paymentsOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: pays }, { data: mpesa }] = await Promise.all([
      supabaseAdmin.from("payments").select("*").order("created_at", { ascending: false }).limit(30),
      supabaseAdmin.from("mpesa_transactions").select("*").order("created_at", { ascending: false }).limit(30),
    ]);
    return { payments: pays ?? [], mpesa: mpesa ?? [] };
  });

export const locationAccessLogs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ limit: z.number().int().min(1).max(200).optional() }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("location_access_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(data.limit ?? 100);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });
