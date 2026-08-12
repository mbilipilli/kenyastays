import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Starts an iPay hosted checkout for a booking (card / PayPal). */
export const initiateIpayPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        booking_id: z.string().uuid(),
        channel: z.enum(["card", "paypal", "all"]).default("card"),
        phone: z.string().max(20).optional(),
        email: z.string().max(120).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: booking, error } = await supabaseAdmin
      .from("bookings")
      .select("id,total_kes,guest_id")
      .eq("id", data.booking_id)
      .maybeSingle();
    if (error || !booking) throw new Error("Booking not found");
    if (booking.guest_id !== context.userId) throw new Error("Not your booking");

    const { ipayConfigured, buildIpayCheckout } = await import("@/lib/ipay/ipay.server");
    if (!ipayConfigured()) throw new Error("Card payments are not configured yet.");

    const origin =
      process.env["PUBLIC_APP_URL"] ??
      "https://project--4775c4eb-263c-4831-a768-038a33a5e678.lovable.app";
    const orderId = `KS${booking.id.replace(/-/g, "").slice(0, 12).toUpperCase()}${Date.now()
      .toString(36)
      .toUpperCase()}`;

    const { error: insErr } = await supabaseAdmin.from("ipay_transactions").insert({
      booking_id: booking.id,
      user_id: context.userId,
      order_id: orderId,
      amount_kes: booking.total_kes,
      channel: data.channel,
      status: "pending",
    });
    if (insErr) throw new Error(insErr.message);

    const { action, fields } = buildIpayCheckout({
      orderId,
      amountKes: booking.total_kes,
      phone: data.phone ?? "",
      email: data.email ?? String(context.claims?.["email"] ?? ""),
      callbackUrl: `${origin}/api/public/hooks/ipay-callback`,
      successUrl: `${origin}/trips`,
      failUrl: `${origin}/trips`,
      channel: data.channel,
    });

    return { action, fields, order_id: orderId };
  });

/** Poll the status of an iPay checkout after the guest returns. */
export const getIpayStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ order_id: z.string().min(4) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row } = await context.supabase
      .from("ipay_transactions")
      .select("order_id,status,result_desc,amount_kes,booking_id")
      .eq("order_id", data.order_id)
      .maybeSingle();
    if (!row) throw new Error("Not found");
    return row;
  });
