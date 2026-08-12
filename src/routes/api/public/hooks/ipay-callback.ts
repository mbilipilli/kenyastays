import { createFileRoute } from "@tanstack/react-router";

// iPay redirects the guest back here (GET) and also pings it server-to-server.
// We never trust the query params: the payment is confirmed only after
// iPay's IPN status query returns the success code.
async function handle(url: URL) {
  const q = url.searchParams;
  const orderId = q.get("p1") || q.get("oid") || q.get("id") || "";
  const origin = `${url.protocol}//${url.host}`;

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: tx } = await supabaseAdmin
    .from("ipay_transactions")
    .select("*")
    .eq("order_id", orderId)
    .maybeSingle();

  if (!tx) return Response.redirect(`${origin}/trips?payment=unknown`, 302);
  if (tx.status === "success") return Response.redirect(`${origin}/trips?payment=success`, 302);

  const { verifyIpayPayment } = await import("@/lib/ipay/ipay.server");
  let paid = false;
  let raw = "";
  try {
    const res = await verifyIpayPayment(q);
    paid = res.paid;
    raw = res.raw;
  } catch (e: any) {
    raw = String(e?.message ?? e);
  }

  await supabaseAdmin
    .from("ipay_transactions")
    .update({
      status: paid ? "success" : "failed",
      ipay_txn_id: q.get("txncd"),
      ipay_status_code: q.get("status"),
      result_desc: raw,
      raw: Object.fromEntries(q.entries()),
    })
    .eq("id", tx.id);

  if (!paid) return Response.redirect(`${origin}/trips?payment=failed`, 302);

  await supabaseAdmin.from("bookings").update({ status: "confirmed" }).eq("id", tx.booking_id);
  await supabaseAdmin.from("payments").insert({
    booking_id: tx.booking_id,
    user_id: tx.user_id,
    amount_kes: tx.amount_kes,
    method: "card",
    status: "success",
    provider_ref: q.get("txncd") ?? tx.order_id,
  });

  // Same split as M-Pesa: host share goes out, platform keeps its fees.
  try {
    const { payoutHostForBooking } = await import("@/lib/mpesa/payouts.server");
    await payoutHostForBooking(tx.booking_id);
  } catch (e) {
    console.error("Host payout failed", e);
  }

  return Response.redirect(`${origin}/trips?payment=success`, 302);
}

export const Route = createFileRoute("/api/public/hooks/ipay-callback")({
  server: {
    handlers: {
      GET: async ({ request }) => handle(new URL(request.url)),
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const body = await request.text().catch(() => "");
        if (body) {
          for (const [k, v] of new URLSearchParams(body).entries()) url.searchParams.set(k, v);
        }
        return handle(url);
      },
    },
  },
});
