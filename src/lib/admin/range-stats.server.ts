/** Date-range scoped KPIs, revenue trend and regional booking heat for the admin dashboard. */

const COAST = ["Mombasa", "Diani", "Lamu", "Malindi", "Watamu", "Kilifi"];
const NAIROBI = ["Nairobi", "Kiambu", "Machakos", "Athi River"];

function regionOf(city: string) {
  if (COAST.includes(city)) return "Coast";
  if (NAIROBI.includes(city)) return "Nairobi";
  return "Highlands";
}

const DAY = 86_400_000;

export async function buildRangeStats(supabaseAdmin: any, from: string, to: string) {
  const fromMs = new Date(`${from}T00:00:00.000Z`).getTime();
  const toMs = new Date(`${to}T23:59:59.999Z`).getTime();
  const fromISO = new Date(fromMs).toISOString();
  const toISO = new Date(toMs).toISOString();

  const spanDays = Math.max(1, Math.round((toMs - fromMs) / DAY));
  const prevFromISO = new Date(fromMs - spanDays * DAY).toISOString();

  const [{ data: bookings }, { data: prevBookings }, { data: props }, { data: payouts }] = await Promise.all([
    supabaseAdmin
      .from("bookings")
      .select("id,property_id,status,total_kes,created_at")
      .gte("created_at", fromISO)
      .lte("created_at", toISO),
    supabaseAdmin
      .from("bookings")
      .select("total_kes,status,created_at")
      .gte("created_at", prevFromISO)
      .lt("created_at", fromISO),
    supabaseAdmin.from("properties").select("id,city"),
    supabaseAdmin.from("host_payouts").select("amount_kes,status,created_at").gte("created_at", fromISO).lte("created_at", toISO),
  ]);

  const B: any[] = bookings ?? [];
  const cityById: Record<string, string> = {};
  (props ?? []).forEach((p: any) => (cityById[p.id] = p.city));

  const isPaid = (b: any) => b.status === "confirmed" || b.status === "completed";
  const paid = B.filter(isPaid);

  const revenue = paid.reduce((s, b) => s + (b.total_kes ?? 0), 0);
  const prevRevenue = (prevBookings ?? []).filter(isPaid).reduce((s: number, b: any) => s + (b.total_kes ?? 0), 0);

  // Revenue trend — daily buckets for short ranges, monthly for long ones
  const daily = spanDays <= 62;
  const buckets: { key: string; label: string; kes: number }[] = [];
  if (daily) {
    for (let t = fromMs; t <= toMs; t += DAY) {
      const d = new Date(t);
      buckets.push({
        key: d.toISOString().slice(0, 10),
        label: d.toLocaleDateString("en-KE", { day: "numeric", month: "short", timeZone: "UTC" }),
        kes: 0,
      });
    }
  } else {
    const start = new Date(Date.UTC(new Date(fromMs).getUTCFullYear(), new Date(fromMs).getUTCMonth(), 1));
    for (let d = start; d.getTime() <= toMs; d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1))) {
      buckets.push({
        key: d.toISOString().slice(0, 7),
        label: d.toLocaleDateString("en-KE", { month: "short", year: "2-digit", timeZone: "UTC" }),
        kes: 0,
      });
    }
  }
  const cut = daily ? 10 : 7;
  paid.forEach((b) => {
    const bucket = buckets.find((x) => x.key === String(b.created_at).slice(0, cut));
    if (bucket) bucket.kes += b.total_kes ?? 0;
  });

  // Regional heat
  const byRegion: Record<string, number> = { Coast: 0, Nairobi: 0, Highlands: 0 };
  paid.forEach((b) => {
    const city = cityById[b.property_id];
    if (city) byRegion[regionOf(city)] += 1;
  });

  const pendingStatuses = ["pending", "queued", "processing"];
  const pendingPayouts = (payouts ?? []).filter((r: any) => pendingStatuses.includes(String(r.status)));

  return {
    from,
    to,
    granularity: daily ? ("daily" as const) : ("monthly" as const),
    revenue_kes: revenue,
    revenueDeltaPct: prevRevenue ? Math.round(((revenue - prevRevenue) / prevRevenue) * 100) : null,
    newBookings: B.length,
    pendingBookings: B.filter((b) => b.status === "pending").length,
    pendingPayouts_kes: pendingPayouts.reduce((s: number, r: any) => s + (r.amount_kes ?? 0), 0),
    pendingPayoutsCount: pendingPayouts.length,
    revenueTrend: buckets.map(({ label, kes }) => ({ label, kes })),
    byRegion,
  };
}
