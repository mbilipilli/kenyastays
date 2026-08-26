// Shared handlers for Daraja B2C result / queue-timeout callbacks.
// Reachable from both the legacy "mpesa-b2c-*" paths and the neutral
// "payout-*" paths that Safaricom's URL validator accepts.

export async function handleB2cResult(request: Request): Promise<Response> {
  const body: any = await request.json().catch(() => ({}));
  const result = body?.Result;
  if (!result) return Response.json({ ResultCode: 0, ResultDesc: "Ignored" });

  const conversationId = result.ConversationID as string | undefined;
  const originator = result.OriginatorConversationID as string | undefined;
  const resultCode = Number(result.ResultCode ?? -1);
  const resultDesc = String(result.ResultDesc ?? "");

  const params: Array<{ Key: string; Value: any }> = result.ResultParameters?.ResultParameter ?? [];
  const get = (k: string) => params.find((p) => p.Key === k)?.Value;
  const receipt = (get("TransactionReceipt") ?? get("TransactionID")) as string | undefined;

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  let query = supabaseAdmin.from("host_payouts").select("id").limit(1);
  query = conversationId
    ? query.eq("conversation_id", conversationId)
    : query.eq("originator_conversation_id", originator ?? "");
  const { data: rows } = await query;
  const payout = rows?.[0];
  if (!payout) return Response.json({ ResultCode: 0, ResultDesc: "Unknown ref" });

  await supabaseAdmin
    .from("host_payouts")
    .update({
      status: resultCode === 0 ? "paid" : "failed",
      result_code: resultCode,
      result_desc: resultDesc,
      mpesa_receipt: receipt ?? null,
      raw: body,
    })
    .eq("id", payout.id);

  return Response.json({ ResultCode: 0, ResultDesc: "OK" });
}

export async function handleB2cTimeout(request: Request): Promise<Response> {
  const body: any = await request.json().catch(() => ({}));
  const conversationId = body?.Result?.ConversationID as string | undefined;
  if (conversationId) {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("host_payouts")
      .update({ status: "failed", result_desc: "Queue timeout", raw: body })
      .eq("conversation_id", conversationId);
  }
  return Response.json({ ResultCode: 0, ResultDesc: "OK" });
}
