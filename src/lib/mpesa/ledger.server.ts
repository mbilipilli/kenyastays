/**
 * Unified STK push ledger: every push we initiated (real booking payments and
 * admin test pushes) joined with the Daraja callbacks that came back for it,
 * plus any callback that matched nothing.
 */
export type LedgerCallback = {
  id: string;
  created_at: string;
  result_code: number | null;
  result_desc: string | null;
  mpesa_receipt: string | null;
  outcome: string;
  matched_kind: string;
  note: string | null;
  raw: any;
};

export type LedgerEntry = {
  id: string;
  kind: "payment" | "test" | "orphan_callback";
  status: string;
  phone: string | null;
  amount_kes: number | null;
  checkout_request_id: string | null;
  merchant_request_id: string | null;
  reference: string | null;
  mpesa_receipt: string | null;
  result_code: number | null;
  result_desc: string | null;
  requested_at: string;
  confirmed_at: string | null;
  callbacks: LedgerCallback[];
};

export async function buildStkLedger(limit = 50): Promise<LedgerEntry[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // Flip stale "sent" test pushes so the ledger doesn't show them as pending forever.
  const cutoff = new Date(Date.now() - 3 * 60 * 1000).toISOString();
  await supabaseAdmin
    .from("mpesa_test_pushes")
    .update({ status: "timeout" })
    .eq("status", "sent")
    .lt("sent_at", cutoff);

  const [txs, tests, logs] = await Promise.all([
    supabaseAdmin
      .from("mpesa_transactions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit),
    supabaseAdmin
      .from("mpesa_test_pushes")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit),
    supabaseAdmin
      .from("mpesa_callback_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit * 3),
  ]);

  const callbacks = logs.data ?? [];
  const byRef = new Map<string, LedgerCallback[]>();
  for (const c of callbacks) {
    const ref = c.checkout_request_id;
    if (!ref) continue;
    const item: LedgerCallback = {
      id: c.id,
      created_at: c.created_at,
      result_code: c.result_code,
      result_desc: c.result_desc,
      mpesa_receipt: c.mpesa_receipt,
      outcome: c.outcome,
      matched_kind: c.matched_kind,
      note: c.note,
      raw: c.raw,
    };
    byRef.set(ref, [...(byRef.get(ref) ?? []), item]);
  }

  const used = new Set<string>();
  const entries: LedgerEntry[] = [];

  for (const t of txs.data ?? []) {
    const ref = t.checkout_request_id ?? "";
    if (ref) used.add(ref);
    entries.push({
      id: t.id,
      kind: "payment",
      status: t.status,
      phone: t.phone,
      amount_kes: t.amount_kes,
      checkout_request_id: t.checkout_request_id,
      merchant_request_id: t.merchant_request_id,
      reference: t.booking_id ? `Booking ${t.booking_id.slice(0, 8)}` : null,
      mpesa_receipt: t.mpesa_receipt,
      result_code: t.result_code,
      result_desc: t.result_desc,
      requested_at: t.created_at,
      confirmed_at: t.status === "success" ? t.updated_at : null,
      callbacks: (ref && byRef.get(ref)) || [],
    });
  }

  for (const t of tests.data ?? []) {
    const ref = t.checkout_request_id ?? "";
    if (ref) used.add(ref);
    entries.push({
      id: t.id,
      kind: "test",
      status: t.status,
      phone: t.phone,
      amount_kes: t.amount_kes,
      checkout_request_id: t.checkout_request_id,
      merchant_request_id: t.merchant_request_id,
      reference: t.account_ref ?? "Test push",
      mpesa_receipt: t.mpesa_receipt,
      result_code: t.result_code,
      result_desc: t.result_desc ?? t.error,
      requested_at: t.created_at,
      confirmed_at: t.confirmed_at,
      callbacks: (ref && byRef.get(ref)) || [],
    });
  }

  // Callbacks that never matched a push we know about.
  for (const c of callbacks) {
    const ref = c.checkout_request_id;
    if (ref && used.has(ref)) continue;
    entries.push({
      id: c.id,
      kind: "orphan_callback",
      status: "unmatched",
      phone: c.phone,
      amount_kes: c.amount_kes,
      checkout_request_id: ref,
      merchant_request_id: c.merchant_request_id,
      reference: null,
      mpesa_receipt: c.mpesa_receipt,
      result_code: c.result_code,
      result_desc: c.result_desc,
      requested_at: c.created_at,
      confirmed_at: null,
      callbacks: [
        {
          id: c.id,
          created_at: c.created_at,
          result_code: c.result_code,
          result_desc: c.result_desc,
          mpesa_receipt: c.mpesa_receipt,
          outcome: c.outcome,
          matched_kind: c.matched_kind,
          note: c.note,
          raw: c.raw,
        },
      ],
    });
  }

  entries.sort((a, b) => +new Date(b.requested_at) - +new Date(a.requested_at));
  return entries.slice(0, limit);
}
