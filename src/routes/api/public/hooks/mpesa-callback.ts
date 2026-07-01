import { createFileRoute } from "@tanstack/react-router";

// Safaricom Daraja does not sign callbacks. We authenticate by matching
// the CheckoutRequestID against a pending mpesa_transactions row.
export const Route = createFileRoute("/api/public/hooks/mpesa-callback")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body: any = await request.json().catch(() => ({}));
        const stk = body?.Body?.stkCallback;
        if (!stk) return Response.json({ ResultCode: 0, ResultDesc: "Ignored" });
        const checkoutRequestId = stk.CheckoutRequestID as string;
        const resultCode = stk.ResultCode as number;
        const resultDesc = stk.ResultDesc as string;

        const items: Array<{ Name: string; Value: any }> = stk.CallbackMetadata?.Item ?? [];
        const get = (name: string) => items.find((i) => i.Name === name)?.Value;
        const receipt = get("MpesaReceiptNumber") as string | undefined;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: tx } = await supabaseAdmin
          .from("mpesa_transactions")
          .select("*")
          .eq("checkout_request_id", checkoutRequestId)
          .maybeSingle();
        if (!tx) return Response.json({ ResultCode: 0, ResultDesc: "Unknown ref" });

        const status = resultCode === 0 ? "success" : "failed";
        await supabaseAdmin
          .from("mpesa_transactions")
          .update({
            status,
            result_code: resultCode,
            result_desc: resultDesc,
            mpesa_receipt: receipt,
            raw_callback: body,
          })
          .eq("id", tx.id);

        if (resultCode === 0) {
          await supabaseAdmin.from("bookings").update({ status: "confirmed" }).eq("id", tx.booking_id);
          await supabaseAdmin.from("payments").insert({
            booking_id: tx.booking_id,
            user_id: tx.user_id,
            amount_kes: tx.amount_kes,
            method: "mpesa",
            status: "success",
            provider_ref: receipt ?? checkoutRequestId,
            phone: tx.phone,
          });
        }
        return Response.json({ ResultCode: 0, ResultDesc: "OK" });
      },
    },
  },
});
