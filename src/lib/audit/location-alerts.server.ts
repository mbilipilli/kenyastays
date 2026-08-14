/**
 * Alerting for exact-location access. Runs right after an audit row is written.
 * Two triggers:
 *   1. threshold     — a user (or IP) makes more than N location requests within a window
 *   2. suspicious_ip — the request IP matches an admin-maintained prefix list
 * Never throws: alerting must not break the request it is watching.
 */
type EvalArgs = {
  userId: string | null;
  action: string;
  ip: string | null;
};

const DEDUPE_MINUTES = 10;

export async function evaluateLocationAlerts(args: EvalArgs): Promise<void> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: rule } = await supabaseAdmin
      .from("location_alert_rules")
      .select("enabled,window_minutes,max_requests")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!rule || !rule.enabled) return;

    // ---- suspicious IP match -------------------------------------------------
    if (args.ip) {
      const { data: ips } = await supabaseAdmin
        .from("suspicious_ips")
        .select("ip_prefix,note")
        .eq("is_active", true);
      const hit = (ips ?? []).find((r) => args.ip!.startsWith(r.ip_prefix));
      if (hit) {
        await raise(supabaseAdmin, {
          kind: "suspicious_ip",
          user_id: args.userId,
          ip_address: args.ip,
          action: args.action,
          request_count: 1,
          window_minutes: null,
          details: `IP ${args.ip} matches watchlist entry "${hit.ip_prefix}"${hit.note ? ` — ${hit.note}` : ""}`,
        });
      }
    }

    // ---- volume threshold ----------------------------------------------------
    const since = new Date(Date.now() - rule.window_minutes * 60_000).toISOString();
    let countQuery = supabaseAdmin
      .from("location_access_logs")
      .select("*", { count: "exact", head: true })
      .gte("created_at", since);
    countQuery = args.userId
      ? countQuery.eq("user_id", args.userId)
      : args.ip
        ? countQuery.eq("ip_address", args.ip)
        : countQuery.is("user_id", null);

    const { count } = await countQuery;
    if ((count ?? 0) > rule.max_requests) {
      await raise(supabaseAdmin, {
        kind: "threshold",
        user_id: args.userId,
        ip_address: args.ip,
        action: args.action,
        request_count: count ?? 0,
        window_minutes: rule.window_minutes,
        details: `${count} exact-location requests in the last ${rule.window_minutes} min (limit ${rule.max_requests})`,
      });
    }
  } catch (err) {
    console.error("[location-alerts] evaluation failed", err);
  }
}

type AlertRow = {
  kind: "threshold" | "suspicious_ip";
  user_id: string | null;
  ip_address: string | null;
  action: string;
  request_count: number;
  window_minutes: number | null;
  details: string;
};

/** Insert an alert unless an identical one was already raised very recently. */
async function raise(supabaseAdmin: any, row: AlertRow) {
  const since = new Date(Date.now() - DEDUPE_MINUTES * 60_000).toISOString();
  let dupe = supabaseAdmin
    .from("location_alerts")
    .select("id", { count: "exact", head: true })
    .eq("kind", row.kind)
    .gte("created_at", since);
  dupe = row.user_id ? dupe.eq("user_id", row.user_id) : dupe.is("user_id", null);
  if (row.ip_address) dupe = dupe.eq("ip_address", row.ip_address);
  const { count } = await dupe;
  if ((count ?? 0) > 0) return;

  await supabaseAdmin.from("location_alerts").insert(row);
  console.warn(`[location-alerts] ${row.kind}: ${row.details}`);
}
