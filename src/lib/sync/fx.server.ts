import { supabaseAdmin } from "@/integrations/supabase/client.server";

const FALLBACK: Record<string, number> = { USD: 129, EUR: 140 }; // KES per unit

export async function getRateToKes(currency: string): Promise<number> {
  const cur = currency.toUpperCase();
  if (cur === "KES") return 1;
  const { data } = await supabaseAdmin
    .from("fx_rates")
    .select("rate,fetched_at")
    .eq("base", cur)
    .eq("quote", "KES")
    .maybeSingle();
  if (data && Date.now() - new Date(data.fetched_at).getTime() < 6 * 3600 * 1000) {
    return Number(data.rate);
  }
  try {
    const res = await fetch(`https://open.er-api.com/v6/latest/${cur}`);
    const json: any = await res.json();
    const rate = json?.rates?.KES;
    if (typeof rate === "number" && rate > 0) {
      await supabaseAdmin.from("fx_rates").upsert(
        { base: cur, quote: "KES", rate, fetched_at: new Date().toISOString() },
        { onConflict: "base,quote" },
      );
      return rate;
    }
  } catch {}
  return data ? Number(data.rate) : FALLBACK[cur] ?? 1;
}

export async function refreshCoreRates() {
  await Promise.all(["USD", "EUR"].map((c) => getRateToKes(c)));
}
