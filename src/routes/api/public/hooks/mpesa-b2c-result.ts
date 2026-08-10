import { createFileRoute } from "@tanstack/react-router";

// Daraja B2C result callback. Authenticated by matching ConversationID
// against a host_payouts row we created when initiating the payout.
export const Route = createFileRoute("/api/public/hooks/mpesa-b2c-result")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body: any = await request.json().catch(() => ({}));
        const result = body?.Result;
        if (!result) return Response.json({ ResultCode: 0, ResultDesc: "Ignored" });

        const conversationId = result.ConversationID as string | undefined;
        const originator = result.OriginatorConversationID as string | undefined;
        const resultCode = Number(result.ResultCode ?? -1);
        const resultDesc = String(result.ResultDesc ?? "");

        const params: Array<{ Key: string; Value: any }> =
          result.ResultParameters?.ResultParameter ?? [];
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
      },
    },
  },
});
