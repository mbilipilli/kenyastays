/** Aggregations powering the admin compliance & analytics dashboard. */
export async function buildInsights(supabaseAdmin: any) {
  const [{ data: props }, { data: bookings }, { data: reviews }, { data: profiles }, { data: roles }, { data: agreements }, { data: payments }] =
    await Promise.all([
      supabaseAdmin.from("properties").select("id,title,city,price_kes,host_id,approval_status,is_active,created_at"),
      supabaseAdmin.from("bookings").select("id,property_id,host_id,guest_id,status,total_kes,commission_kes,service_fee_kes,cleaning_fee_kes,affiliate_commission_kes,host_payout_kes,check_in,check_out,created_at"),
      supabaseAdmin.from("reviews").select("property_id,rating"),
      supabaseAdmin.from("profiles").select("id,full_name,phone,is_verified"),
      supabaseAdmin.from("user_roles").select("user_id,role").eq("role", "host"),
      supabaseAdmin.from("host_agreements").select("user_id,accepted_at,version"),
      supabaseAdmin.from("payments").select("booking_id,method,status,amount_kes,created_at").eq("status", "success"),
    ]);


  const P: any[] = props ?? [];
  const B: any[] = bookings ?? [];
  const R: any[] = reviews ?? [];
  const propById: Record<string, any> = {};
  P.forEach((p) => (propById[p.id] = p));
  const profById: Record<string, any> = {};
  (profiles ?? []).forEach((p: any) => (profById[p.id] = p));
  const agreedBy: Record<string, string> = {};
  (agreements ?? []).forEach((a: any) => (agreedBy[a.user_id] = a.accepted_at));

  const paid = B.filter((b) => b.status === "confirmed" || b.status === "completed");

  // Bookings by location
  const cityCount: Record<string, number> = {};
  paid.forEach((b) => {
    const c = propById[b.property_id]?.city ?? "Other";
    cityCount[c] = (cityCount[c] ?? 0) + 1;
  });
  const bookingsByCity = Object.entries(cityCount)
    .map(([city, count]) => ({ city, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // Revenue trend — last 6 months
  const months: { key: string; label: string; kes: number }[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    months.push({ key: d.toISOString().slice(0, 7), label: d.toLocaleString("en", { month: "short" }), kes: 0 });
  }
  paid.forEach((b) => {
    const m = months.find((x) => x.key === String(b.created_at).slice(0, 7));
    if (m) m.kes += b.total_kes ?? 0;
  });
  const revenueTrend = months.map(({ label, kes }) => ({ label, kes }));

  // Ratings per property/host
  const ratingByProp: Record<string, { sum: number; n: number }> = {};
  R.forEach((r) => {
    const a = (ratingByProp[r.property_id] ??= { sum: 0, n: 0 });
    a.sum += r.rating;
    a.n++;
  });

  // Host management table
  const hostIds = [...new Set([...(roles ?? []).map((r: any) => r.user_id), ...P.map((p) => p.host_id)])];
  const hostManagement = hostIds.map((id) => {
    const hb = B.filter((b) => b.host_id === id);
    const earnings = hb
      .filter((b) => b.status === "confirmed" || b.status === "completed")
      .reduce((s, b) => s + (b.host_payout_kes ?? 0), 0);
    const cancellations = hb.filter((b) => b.status === "cancelled").length;
    const listings = P.filter((p) => p.host_id === id);
    let sum = 0, n = 0;
    listings.forEach((p) => {
      const a = ratingByProp[p.id];
      if (a) { sum += a.sum; n += a.n; }
    });
    return {
      id,
      name: profById[id]?.full_name ?? "Unnamed host",
      verified: !!profById[id]?.is_verified,
      hasPhone: !!profById[id]?.phone,
      agreementAt: agreedBy[id] ?? null,
      listings: listings.length,
      earnings_kes: earnings,
      rating: n ? Number((sum / n).toFixed(1)) : null,
      cancellations,
    };
  }).sort((a, b) => b.earnings_kes - a.earnings_kes);

  // Document verification queue (hosts with pending listings or missing docs)
  const documentQueue = hostManagement
    .filter((h) => !h.verified || !h.agreementAt || !h.hasPhone)
    .slice(0, 20)
    .map((h) => ({
      id: h.id,
      name: h.name,
      id_status: h.verified ? "Verified" : "Pending",
      kra_status: h.hasPhone ? "Submitted" : "Pending",
      ownership_status: h.agreementAt ? "Verified" : "Pending",
    }));

  // Guest insights
  const guestCounts: Record<string, number> = {};
  paid.forEach((b) => (guestCounts[b.guest_id] = (guestCounts[b.guest_id] ?? 0) + 1));
  const guests = Object.values(guestCounts);
  const repeatPct = guests.length ? Math.round((guests.filter((n) => n > 1).length / guests.length) * 100) : 0;
  const avgRating = R.length ? Number((R.reduce((s, r) => s + r.rating, 0) / R.length).toFixed(1)) : null;
  const guestInsights = {
    avgRating,
    repeatPct,
    sentiment: avgRating == null ? "No data" : avgRating >= 4.2 ? "Positive" : avgRating >= 3.4 ? "Neutral" : "Negative",
    totalGuests: guests.length,
  };

  // Commissions breakdown
  const commissions = {
    commission_kes: paid.reduce((s, b) => s + (b.commission_kes ?? 0), 0),
    service_fee_kes: paid.reduce((s, b) => s + (b.service_fee_kes ?? 0), 0),
    cleaning_fee_kes: paid.reduce((s, b) => s + (b.cleaning_fee_kes ?? 0), 0),
    affiliate_kes: paid.reduce((s, b) => s + (b.affiliate_commission_kes ?? 0), 0),
    host_payout_kes: paid.reduce((s, b) => s + (b.host_payout_kes ?? 0), 0),
    gross_kes: paid.reduce((s, b) => s + (b.total_kes ?? 0), 0),
  };

  // Occupancy by city — nights sold vs available nights over the last 30 days
  const WINDOW_DAYS = 30;
  const windowStart = Date.now() - WINDOW_DAYS * 86400_000;
  const nightsByCity: Record<string, number> = {};
  paid.forEach((b) => {
    const city = propById[b.property_id]?.city;
    if (!city || !b.check_in || !b.check_out) return;
    const inMs = new Date(b.check_in).getTime();
    const outMs = new Date(b.check_out).getTime();
    if (outMs < windowStart) return;
    const from = Math.max(inMs, windowStart);
    const nights = Math.max(0, Math.round((outMs - from) / 86400_000));
    nightsByCity[city] = (nightsByCity[city] ?? 0) + nights;
  });
  const listingsByCity: Record<string, number> = {};
  P.forEach((p) => (listingsByCity[p.city] = (listingsByCity[p.city] ?? 0) + 1));
  const occupancyByCity = Object.entries(listingsByCity)
    .map(([city, n]) => ({
      city,
      occupancy: Math.min(100, Math.round(((nightsByCity[city] ?? 0) / (n * WINDOW_DAYS)) * 100)),
      listings: n,
    }))
    .sort((a, b) => b.occupancy - a.occupancy)
    .slice(0, 8);

  // Commission earned per payment method
  const bookingById: Record<string, any> = {};
  B.forEach((b) => (bookingById[b.id] = b));
  const methodTotals: Record<string, { commission_kes: number; volume_kes: number; count: number }> = {
    mpesa: { commission_kes: 0, volume_kes: 0, count: 0 },
    card: { commission_kes: 0, volume_kes: 0, count: 0 },
    bank: { commission_kes: 0, volume_kes: 0, count: 0 },
  };
  (payments ?? []).forEach((p: any) => {
    const key = methodTotals[p.method] ? p.method : "bank";
    const bk = bookingById[p.booking_id];
    methodTotals[key].commission_kes += (bk?.commission_kes ?? 0) + (bk?.service_fee_kes ?? 0);
    methodTotals[key].volume_kes += p.amount_kes ?? 0;
    methodTotals[key].count += 1;
  });
  const commissionByMethod = [
    { method: "M-Pesa", ...methodTotals.mpesa },
    { method: "Card", ...methodTotals.card },
    { method: "Bank transfer", ...methodTotals.bank },
  ];

  // Monthly commission trend (same 6-month window as revenue)
  const commissionTrend = months.map((m) => ({
    label: m.label,
    kes: paid
      .filter((b) => String(b.created_at).slice(0, 7) === m.key)
      .reduce((s, b) => s + (b.commission_kes ?? 0) + (b.service_fee_kes ?? 0), 0),
  }));

  // Compliance monitoring — derived signals
  const cityAvg: Record<string, { sum: number; n: number }> = {};
  P.forEach((p) => {
    const a = (cityAvg[p.city] ??= { sum: 0, n: 0 });
    a.sum += p.price_kes;
    a.n++;
  });
  const compliance: { id: string | null; property: string; city: string; issue: string; severity: "high" | "medium" }[] = [];
  P.forEach((p) => {
    const a = cityAvg[p.city];
    const avg = a && a.n > 1 ? a.sum / a.n : null;
    if (avg && p.price_kes > avg * 3) compliance.push({ id: p.id, property: p.title, city: p.city, issue: "Suspicious pricing (3× city average)", severity: "high" });
    if (p.is_active && p.approval_status !== "approved") compliance.push({ id: p.id, property: p.title, city: p.city, issue: "Live without approval", severity: "high" });
    if (p.approval_status === "pending" && Date.now() - new Date(p.created_at).getTime() > 7 * 86400_000)
      compliance.push({ id: p.id, property: p.title, city: p.city, issue: "Pending review over 7 days", severity: "medium" });
  });
  hostManagement.forEach((h) => {
    if (h.cancellations >= 3) compliance.push({ id: null, property: h.name, city: "Host", issue: `${h.cancellations} cancellations`, severity: "medium" });
  });

  // Escalations — host disputes needing admin follow-up
  const escalations = hostManagement
    .filter((h) => h.cancellations >= 2 || (h.rating != null && h.rating < 3.5) || (!h.verified && h.listings > 0))
    .map((h) => ({
      id: h.id,
      name: h.name,
      reason:
        h.cancellations >= 2
          ? `${h.cancellations} cancellations — guest refund disputes`
          : h.rating != null && h.rating < 3.5
            ? `Low rating (${h.rating}) — quality complaints`
            : "Unverified host with live listings",
      severity: (h.cancellations >= 3 || (h.rating != null && h.rating < 3) ? "high" : "medium") as "high" | "medium",
      listings: h.listings,
      earnings_kes: h.earnings_kes,
    }))
    .slice(0, 15);

  return {
    bookingsByCity,
    occupancyByCity,
    revenueTrend,
    commissionTrend,
    commissionByMethod,
    hostManagement,
    escalations,
    documentQueue,
    guestInsights,
    commissions,
    compliance: compliance.slice(0, 25),
  };
}

