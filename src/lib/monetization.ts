// Central place for all monetization constants + fee math.
// Keep in sync with server-side calc in bookings.functions.ts.

export const COMMISSION_PCT = 0.10;      // Host commission (deducted from subtotal)
export const SERVICE_FEE_PCT = 0.04;     // Guest platform service fee (added to total)

// Featured placement plans
export const FEATURED_PLANS = {
  featured_stay: { label: "Featured Stay", price_kes: 2500, blurb: "Highlighted card in city search results." },
  homepage_highlight: { label: "Homepage Highlight", price_kes: 6000, blurb: "Rotating placement on the homepage." },
} as const;

export type FeaturedPlan = keyof typeof FEATURED_PLANS;

// Cleaning service default cut (platform takes a % of cleaning fee paid to partner)
export const DEFAULT_CLEANING_PLATFORM_CUT_PCT = 15.0;

export type FeeBreakdown = {
  subtotal_kes: number;
  cleaning_fee_kes: number;
  service_fee_kes: number;
  total_kes: number;
  commission_kes: number;
  host_payout_kes: number;
};

export function calcFees(input: {
  price_kes: number;
  nights: number;
  cleaning_fee_kes?: number;
}): FeeBreakdown {
  const subtotal = input.price_kes * input.nights;
  const cleaning = input.cleaning_fee_kes ?? 0;
  const service_fee = Math.round(subtotal * SERVICE_FEE_PCT);
  const total = subtotal + cleaning + service_fee;
  const commission = Math.round(subtotal * COMMISSION_PCT);
  const host_payout = subtotal - commission + cleaning; // cleaning passes to host who forwards to partner
  return {
    subtotal_kes: subtotal,
    cleaning_fee_kes: cleaning,
    service_fee_kes: service_fee,
    total_kes: total,
    commission_kes: commission,
    host_payout_kes: host_payout,
  };
}
