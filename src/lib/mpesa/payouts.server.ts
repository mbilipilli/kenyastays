// Splits a confirmed booking payment: platform keeps commission + service fee,
// the host's share is disbursed straight to their M-Pesa via Daraja B2C.
export function appOrigin(): string {
  return (
    process.env["PUBLIC_APP_URL"] ??
    "https://kenyastayz.lovable.app"
  );
}

export async function payoutHostForBooking(bookingId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: booking } = await supabaseAdmin
    .from("bookings")
    .select("id,host_id,host_payout_kes,commission_kes,service_fee_kes")
    .eq("id", bookingId)
    .maybeSingle();
  if (!booking) return { ok: false, reason: "Booking not found" };
  if (!booking.host_payout_kes || booking.host_payout_kes < 1)
    return { ok: false, reason: "Nothing to pay out" };

  // Idempotency — one payout row per booking.
  const { data: existing } = await supabaseAdmin
    .from("host_payouts")
    .select("id,status")
    .eq("booking_id", bookingId)
    .maybeSingle();
  if (existing && existing.status !== "failed") return { ok: true, reason: "Already queued" };

  const { data: host } = await supabaseAdmin
    .from("profiles")
    .select("payout_phone,phone")
    .eq("id", booking.host_id)
    .maybeSingle();

  const { normalizePhone } = await import("@/lib/mpesa/daraja.server");
  const rawPhone = host?.payout_phone ?? host?.phone ?? null;
  const phone = rawPhone ? normalizePhone(rawPhone) : null;

  const base = {
    booking_id: booking.id,
    host_id: booking.host_id,
    amount_kes: booking.host_payout_kes,
    phone,
  };

  if (!phone) {
    await supabaseAdmin
      .from("host_payouts")
      .upsert({ ...base, status: "failed", result_desc: "Host has no M-Pesa payout number" }, { onConflict: "booking_id" });
    return { ok: false, reason: "Host has no payout number" };
  }

  const { b2cConfigured, b2cPayout } = await import("@/lib/mpesa/b2c.server");
  if (!b2cConfigured()) {
    await supabaseAdmin
      .from("host_payouts")
      .upsert({ ...base, status: "pending_manual", result_desc: "B2C credentials not configured" }, { onConflict: "booking_id" });
    return { ok: false, reason: "B2C not configured" };
  }

  const originator = `KS-${booking.id.slice(0, 8)}-${Date.now().toString(36)}`;
  try {
    const res = await b2cPayout({
      phone,
      amount: booking.host_payout_kes,
      remarks: `Kenya Stays payout ${booking.id.slice(0, 8)}`,
      occasion: "Host payout",
      originatorConversationId: originator,
      resultUrl: `${appOrigin()}/api/public/hooks/mpesa-b2c-result`,
      timeoutUrl: `${appOrigin()}/api/public/hooks/mpesa-b2c-timeout`,
    });
    await supabaseAdmin.from("host_payouts").upsert(
      {
        ...base,
        status: "sent",
        conversation_id: res.conversationId,
        originator_conversation_id: res.originatorConversationId ?? originator,
        result_desc: res.responseDescription,
      },
      { onConflict: "booking_id" },
    );
    return { ok: true };
  } catch (e: any) {
    await supabaseAdmin.from("host_payouts").upsert(
      { ...base, status: "failed", originator_conversation_id: originator, result_desc: String(e?.message ?? e) },
      { onConflict: "booking_id" },
    );
    return { ok: false, reason: String(e?.message ?? e) };
  }
}
