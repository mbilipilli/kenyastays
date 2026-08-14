import { getRequest } from "@tanstack/react-start/server";

type LogArgs = {
  userId: string | null;
  action: string;
  propertyIds: string[];
  recordCount: number;
  exposedAddress: boolean;
  exposedGps: boolean;
};

/**
 * Records every server response that carried an exact street address or exact
 * GPS coordinates. Never throws — auditing must not break the request.
 */
export async function logLocationAccess(args: LogArgs): Promise<void> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    let ip: string | null = null;
    let ua: string | null = null;
    try {
      const req = getRequest();
      const h = req?.headers;
      ip =
        h?.get("cf-connecting-ip") ??
        h?.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        null;
      ua = h?.get("user-agent") ?? null;
    } catch {
      // request context unavailable (e.g. prerender)
    }

    await supabaseAdmin.from("location_access_logs").insert({
      user_id: args.userId,
      action: args.action,
      property_ids: args.propertyIds.slice(0, 200),
      record_count: args.recordCount,
      exposed_address: args.exposedAddress,
      exposed_gps: args.exposedGps,
      ip_address: ip,
      user_agent: ua ? ua.slice(0, 500) : null,
    });

    const { evaluateLocationAlerts } = await import("./location-alerts.server");
    await evaluateLocationAlerts({ userId: args.userId, action: args.action, ip });

  } catch (err) {
    console.error("[location-audit] failed to write audit row", err);
  }
}
