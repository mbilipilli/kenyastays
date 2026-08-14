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

export const locationAlerts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ limit: z.number().int().min(1).max(200).optional() }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: alerts }, { data: rule }, { data: ips }] = await Promise.all([
      supabaseAdmin
        .from("location_alerts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(data.limit ?? 100),
      supabaseAdmin.from("location_alert_rules").select("*").order("created_at").limit(1).maybeSingle(),
      supabaseAdmin.from("suspicious_ips").select("*").order("created_at", { ascending: false }),
    ]);
    return { alerts: alerts ?? [], rule, suspiciousIps: ips ?? [] };
  });

export const updateLocationAlertRule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        enabled: z.boolean(),
        window_minutes: z.number().int().min(1).max(1440),
        max_requests: z.number().int().min(1).max(10000),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existing } = await supabaseAdmin
      .from("location_alert_rules")
      .select("id")
      .order("created_at")
      .limit(1)
      .maybeSingle();
    const { error } = existing
      ? await supabaseAdmin.from("location_alert_rules").update(data).eq("id", existing.id)
      : await supabaseAdmin.from("location_alert_rules").insert(data);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const addSuspiciousIp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ ip_prefix: z.string().min(1).max(45), note: z.string().max(200).optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("suspicious_ips")
      .upsert(
        { ip_prefix: data.ip_prefix.trim(), note: data.note ?? null, is_active: true },
        { onConflict: "ip_prefix" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const removeSuspiciousIp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("suspicious_ips").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const acknowledgeLocationAlert = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("location_alerts")
      .update({ acknowledged_at: new Date().toISOString(), acknowledged_by: context.userId })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------------- Listing approval workflow ----------------

export const listingsForReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ status: z.enum(["pending", "approved", "rejected"]).optional() }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("properties")
      .select("id,title,city,price_kes,host_id,is_active,approval_status,admin_notes,reviewed_at,created_at")
      .order("created_at", { ascending: false })
      .limit(60);
    if (data.status) q = q.eq("approval_status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    const hostIds = [...new Set((rows ?? []).map((r: any) => r.host_id))];
    const [{ data: profiles }, { data: agreements }] = await Promise.all([
      hostIds.length
        ? supabaseAdmin.from("profiles").select("id,full_name,phone,is_verified").in("id", hostIds)
        : Promise.resolve({ data: [] as any[] }),
      hostIds.length
        ? supabaseAdmin.from("host_agreements").select("user_id,accepted_at,version").in("user_id", hostIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);
    const byId: Record<string, any> = {};
    (profiles ?? []).forEach((p: any) => (byId[p.id] = p));
    const agreed: Record<string, string> = {};
    (agreements ?? []).forEach((a: any) => (agreed[a.user_id] = a.accepted_at));

    return (rows ?? []).map((r: any) => ({
      ...r,
      host_name: byId[r.host_id]?.full_name ?? "Host",
      host_verified: !!byId[r.host_id]?.is_verified,
      agreement_accepted_at: agreed[r.host_id] ?? null,
    }));
  });

export const reviewListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        id: z.string().uuid(),
        decision: z.enum(["approved", "rejected"]),
        notes: z.string().max(1000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("properties")
      .update({
        approval_status: data.decision,
        admin_notes: data.notes ?? null,
        reviewed_at: new Date().toISOString(),
        reviewed_by: context.userId,
        is_active: data.decision === "approved",
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true, status: data.decision };
  });

// ---------------- Compliance / insights dashboard ----------------

export const adminInsights = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { buildInsights } = await import("@/lib/admin/insights.server");
    return buildInsights(supabaseAdmin);
  });

// ---------------- Host payouts ----------------

export const hostPayoutsOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await supabaseAdmin
      .from("host_payouts")
      .select("id,host_id,booking_id,amount_kes,phone,status,mpesa_receipt,result_desc,created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    const ids = [...new Set((rows ?? []).map((r: any) => r.host_id))];
    const { data: profiles } = ids.length
      ? await supabaseAdmin.from("profiles").select("id,full_name").in("id", ids)
      : { data: [] as any[] };
    const nameById: Record<string, string> = {};
    (profiles ?? []).forEach((p: any) => (nameById[p.id] = p.full_name ?? "Host"));
    const list = (rows ?? []).map((r: any) => ({ ...r, host_name: nameById[r.host_id] ?? "Host" }));
    const sum = (pred: (s: string) => boolean) =>
      list.filter((r: any) => pred(String(r.status))).reduce((s: number, r: any) => s + (r.amount_kes ?? 0), 0);
    return {
      payouts: list,
      totals: {
        completed_kes: sum((s) => s === "success" || s === "completed"),
        pending_kes: sum((s) => s === "pending" || s === "queued" || s === "processing"),
        failed_kes: sum((s) => s === "failed" || s === "error"),
      },
    };
  });

// ---------------- Host enquiries / intended hosts ----------------

export const hostEnquiries = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: roles }, { data: agreements }, { data: props }] = await Promise.all([
      supabaseAdmin.from("user_roles").select("user_id,created_at").eq("role", "host"),
      supabaseAdmin.from("host_agreements").select("user_id,accepted_at,version"),
      supabaseAdmin.from("properties").select("host_id,approval_status"),
    ]);
    const listingCount: Record<string, number> = {};
    const approvedCount: Record<string, number> = {};
    (props ?? []).forEach((p: any) => {
      listingCount[p.host_id] = (listingCount[p.host_id] ?? 0) + 1;
      if (p.approval_status === "approved") approvedCount[p.host_id] = (approvedCount[p.host_id] ?? 0) + 1;
    });
    const agreedBy: Record<string, string> = {};
    (agreements ?? []).forEach((a: any) => (agreedBy[a.user_id] = a.accepted_at));

    const ids = [...new Set((roles ?? []).map((r: any) => r.user_id))].filter(
      (id) => !approvedCount[id],
    );
    if (!ids.length) return [];
    const { data: profiles } = await supabaseAdmin
      .from("profiles")
      .select("id,full_name,phone,is_verified,created_at")
      .in("id", ids);
    return (profiles ?? [])
      .map((p: any) => ({
        id: p.id,
        name: p.full_name ?? "Unnamed",
        phone: p.phone ?? null,
        verified: !!p.is_verified,
        agreement_accepted_at: agreedBy[p.id] ?? null,
        drafts: listingCount[p.id] ?? 0,
        joined_at: p.created_at,
        stage: (listingCount[p.id] ?? 0) > 0 ? "Listing submitted" : agreedBy[p.id] ? "Agreement signed" : "Enquiry only",
      }))
      .sort((a: any, b: any) => String(b.joined_at).localeCompare(String(a.joined_at)));
  });

