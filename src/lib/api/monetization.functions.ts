import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { FEATURED_PLANS, type FeaturedPlan } from "@/lib/monetization";

// ============ Featured / premium placement ============
export const subscribeFeatured = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      property_id: z.string().uuid(),
      plan: z.enum(["featured_stay", "homepage_highlight"]),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const plan = FEATURED_PLANS[data.plan as FeaturedPlan];
    const { data: prop, error: pErr } = await supabase
      .from("properties")
      .select("id,host_id")
      .eq("id", data.property_id)
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);
    if (!prop || prop.host_id !== userId) throw new Error("Not your listing");

    const now = new Date();
    const periodEnd = new Date(now.getTime() + 30 * 86400000).toISOString();
    const { data: sub, error } = await supabase
      .from("featured_subscriptions")
      .insert({
        property_id: data.property_id,
        profile_id: userId,
        plan: data.plan,
        monthly_price_kes: plan.price_kes,
        status: "active",
        current_period_end: periodEnd,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);

    await supabase
      .from("properties")
      .update({ is_featured: true, featured_until: periodEnd })
      .eq("id", data.property_id);
    return sub;
  });

export const cancelFeatured = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: sub, error } = await supabase
      .from("featured_subscriptions")
      .update({ status: "cancelled" })
      .eq("id", data.id)
      .eq("profile_id", userId)
      .select()
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (sub) {
      await supabase
        .from("properties")
        .update({ is_featured: false, featured_until: null })
        .eq("id", sub.property_id)
        .eq("host_id", userId);
    }
    return { ok: true };
  });

export const mySubscriptions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("featured_subscriptions")
      .select("*, properties:property_id(title,city)")
      .eq("profile_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

// ============ Cleaning partners ============
export const listCleaningPartners = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("cleaning_partners")
      .select("*")
      .eq("is_active", true)
      .order("city");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const setCleaningPartner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      property_id: z.string().uuid(),
      partner_id: z.string().uuid().nullable(),
      cleaning_fee_kes: z.number().int().min(0).max(1_000_000),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("properties")
      .update({
        cleaning_partner_id: data.partner_id,
        cleaning_fee_kes: data.partner_id ? data.cleaning_fee_kes : 0,
      })
      .eq("id", data.property_id)
      .eq("host_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============ Affiliates ============
export const resolveAffiliate = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ code: z.string().trim().min(2).max(40) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: aff } = await supabaseAdmin
      .from("affiliates")
      .select("id,name,code,commission_pct")
      .eq("code", data.code)
      .eq("is_active", true)
      .maybeSingle();
    return aff;
  });

export const myAffiliateStats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: aff } = await supabase
      .from("affiliates")
      .select("*")
      .eq("profile_id", userId)
      .maybeSingle();
    if (!aff) return null;
    const { data: referrals } = await supabase
      .from("affiliate_referrals")
      .select("*")
      .eq("affiliate_id", aff.id)
      .order("created_at", { ascending: false })
      .limit(50);
    return { affiliate: aff, referrals: referrals ?? [] };
  });
