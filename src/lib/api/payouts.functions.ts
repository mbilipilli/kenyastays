import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Host sets the M-Pesa number their booking earnings are sent to. */
export const setPayoutPhone = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ phone: z.string().min(9).max(15) }).parse(d))
  .handler(async ({ data, context }) => {
    const { normalizePhone } = await import("@/lib/mpesa/daraja.server");
    const phone = normalizePhone(data.phone);
    const { error } = await context.supabase
      .from("profiles")
      .update({ payout_phone: phone })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true, phone };
  });

export const getPayoutSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("profiles")
      .select("payout_phone,phone")
      .eq("id", context.userId)
      .maybeSingle();
    return { payout_phone: data?.payout_phone ?? null, phone: data?.phone ?? null };
  });

/** Payout history for the signed-in host. */
export const listMyPayouts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("host_payouts")
      .select(
        "id,booking_id,amount_kes,phone,status,mpesa_receipt,result_code,result_desc,conversation_id,originator_conversation_id,created_at",
      )
      .eq("host_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(50);
    return data ?? [];
  });

/** Admin-only: retry a failed or manual payout. */
export const retryPayout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ booking_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("host_payouts").update({ status: "failed" }).eq("booking_id", data.booking_id);
    const { payoutHostForBooking } = await import("@/lib/mpesa/payouts.server");
    return payoutHostForBooking(data.booking_id);
  });

/** Admin-only: all payouts across the platform. */
export const listAllPayouts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");
    const { data } = await context.supabase
      .from("host_payouts")
      .select("id,booking_id,host_id,amount_kes,phone,status,mpesa_receipt,result_desc,created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    return data ?? [];
  });

/** Host-triggered payout for one of their own confirmed bookings. */
export const requestPayout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ booking_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: booking, error } = await context.supabase
      .from("bookings")
      .select("id,host_id,status,host_payout_kes")
      .eq("id", data.booking_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!booking || booking.host_id !== context.userId) throw new Error("Booking not found");
    if (!["confirmed", "completed"].includes(String(booking.status)))
      throw new Error("Confirm the booking before sending a payout");

    const { payoutHostForBooking } = await import("@/lib/mpesa/payouts.server");
    const res = await payoutHostForBooking(booking.id);
    if (!res.ok) throw new Error(res.reason ?? "Payout failed");
    return res;
  });
