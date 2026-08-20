import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * M-Pesa STK Push initiation.
 *
 * To go live, set these runtime secrets:
 *   MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET, MPESA_SHORTCODE,
 *   MPESA_PASSKEY, MPESA_ENV ("sandbox" | "production"),
 *   MPESA_CALLBACK_URL (https://<your-domain>/api/public/hooks/pay-callback)
 *
 * Without these the function records the payment as 'initiated' and
 * returns a friendly stub response so the UI flow stays intact.
 */

const PHONE_RE = /^(?:\+?254|0)?(7|1)\d{8}$/;

function normalizePhone(p: string): string | null {
  const trimmed = p.replace(/\s|-/g, "");
  if (!PHONE_RE.test(trimmed)) return null;
  const digits = trimmed.replace(/^\+?254/, "").replace(/^0/, "");
  return "254" + digits;
}

async function getDarajaToken(env: string, key: string, secret: string) {
  const base = env === "production" ? "https://api.safaricom.co.ke" : "https://sandbox.safaricom.co.ke";
  const auth = Buffer.from(`${key}:${secret}`).toString("base64");
  const res = await fetch(`${base}/oauth/v1/generate/token?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${auth}` },
  });
  if (!res.ok) throw new Error("Failed to authenticate with M-Pesa");
  const json = (await res.json()) as { access_token: string };
  return { token: json.access_token, base };
}

export const initiateMpesa = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ booking_id: z.string().uuid(), phone: z.string().min(7).max(20) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const phone = normalizePhone(data.phone);
    if (!phone) throw new Error("Enter a valid Kenyan phone (e.g. 0712345678)");

    const { data: booking, error } = await supabase
      .from("bookings")
      .select("id,total_kes,guest_id,status")
      .eq("id", data.booking_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!booking) throw new Error("Booking not found");
    if (booking.guest_id !== userId) throw new Error("Not your booking");

    const consumerKey = process.env.MPESA_CONSUMER_KEY;
    const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
    const shortcode = process.env.MPESA_SHORTCODE;
    const passkey = process.env.MPESA_PASSKEY;
    const env = process.env.MPESA_ENV ?? "sandbox";
    const callback = process.env.MPESA_CALLBACK_URL;

    // Record the payment attempt
    const { data: payment, error: payErr } = await supabase
      .from("payments")
      .insert({
        booking_id: booking.id,
        user_id: userId,
        method: "mpesa",
        amount_kes: booking.total_kes,
        phone,
        status: "initiated",
      })
      .select()
      .single();
    if (payErr) throw new Error(payErr.message);

    if (!consumerKey || !consumerSecret || !shortcode || !passkey || !callback) {
      return {
        ok: false,
        pending_setup: true,
        message: "M-Pesa is not yet configured. Add your Safaricom Daraja credentials in the project secrets to enable live STK push.",
        payment_id: payment.id,
      };
    }

    const { token, base } = await getDarajaToken(env, consumerKey, consumerSecret);
    const timestamp = new Date()
      .toISOString()
      .replace(/[-:TZ.]/g, "")
      .slice(0, 14);
    const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString("base64");

    const stk = await fetch(`${base}/mpesa/stkpush/v1/processrequest`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        BusinessShortCode: shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: booking.total_kes,
        PartyA: phone,
        PartyB: shortcode,
        PhoneNumber: phone,
        CallBackURL: callback,
        AccountReference: `BK-${booking.id.slice(0, 8)}`,
        TransactionDesc: `Booking ${booking.id.slice(0, 8)}`,
      }),
    });
    const result = await stk.json();
    await supabase
      .from("payments")
      .update({
        status: stk.ok ? "pending" : "failed",
        provider_ref: result?.CheckoutRequestID ?? null,
        raw: result,
      })
      .eq("id", payment.id);

    if (!stk.ok) throw new Error(result?.errorMessage ?? "M-Pesa request failed");
    return { ok: true, payment_id: payment.id, checkout_request_id: result.CheckoutRequestID };
  });
