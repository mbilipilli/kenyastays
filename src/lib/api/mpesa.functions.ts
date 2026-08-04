import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const initiateMpesaPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ booking_id: z.string().uuid(), phone: z.string().min(9).max(15) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: booking, error } = await supabaseAdmin
      .from("bookings")
      .select("id,total_kes,guest_id,property_id,properties:property_id(title)")
      .eq("id", data.booking_id)
      .maybeSingle();
    if (error || !booking) throw new Error("Booking not found");
    if (booking.guest_id !== context.userId) throw new Error("Not your booking");

    const { normalizePhone, stkPush } = await import("@/lib/mpesa/daraja.server");
    const phone = normalizePhone(data.phone);
    const origin = process.env.PUBLIC_APP_URL ?? "https://project--4775c4eb-263c-4831-a768-038a33a5e678.lovable.app";
    const callbackUrl = `${origin}/api/public/hooks/mpesa-callback`;

    try {
      const res = await stkPush({
        phone,
        amount: booking.total_kes,
        accountRef: booking.id.slice(0, 12),
        description: `Booking ${booking.id.slice(0, 6)}`,
        callbackUrl,
      });
      await supabaseAdmin.from("mpesa_transactions").insert({
        booking_id: booking.id,
        user_id: context.userId,
        phone,
        amount_kes: booking.total_kes,
        checkout_request_id: res.checkoutRequestId,
        merchant_request_id: res.merchantRequestId,
        status: "pending",
      });
      return { ok: true, checkoutRequestId: res.checkoutRequestId };
    } catch (e: any) {
      // Record failed attempt so dashboard reflects it
      await supabaseAdmin.from("mpesa_transactions").insert({
        booking_id: booking.id,
        user_id: context.userId,
        phone,
        amount_kes: booking.total_kes,
        status: "error",
        result_desc: String(e?.message ?? e),
      });
      throw new Error(e?.message ?? "STK Push failed");
    }
  });

export const getMpesaStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ checkout_request_id: z.string() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("mpesa_transactions")
      .select("*")
      .eq("checkout_request_id", data.checkout_request_id)
      .maybeSingle();
    if (!row || row.user_id !== context.userId) throw new Error("Not found");
    return row;
  });

export const testStkPush = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ phone: z.string().min(9).max(15), amount: z.number().int().min(1).max(1000).default(1) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const { normalizePhone, stkPush } = await import("@/lib/mpesa/daraja.server");
    const phone = normalizePhone(data.phone);
    const env = process.env["MPESA_ENV"] ?? "sandbox";
    const origin =
      process.env["PUBLIC_APP_URL"] ??
      "https://project--4775c4eb-263c-4831-a768-038a33a5e678.lovable.app";

    try {
      const res = await stkPush({
        phone,
        amount: data.amount,
        accountRef: "TEST",
        description: "Test STK Push",
        callbackUrl: `${origin}/api/public/hooks/mpesa-callback`,
      });
      return { ok: true as const, env, phone, ...res };
    } catch (e: any) {
      return { ok: false as const, env, phone, error: String(e?.message ?? e) };
    }
  });
