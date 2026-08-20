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

        const logRow = {
          checkout_request_id: checkoutRequestId ?? null,
          merchant_request_id: (stk.MerchantRequestID as string) ?? null,
          result_code: resultCode ?? null,
          result_desc: resultDesc ?? null,
          mpesa_receipt: receipt ?? null,
          amount_kes: Number(get("Amount") ?? 0) || null,
          phone: get("PhoneNumber") ? String(get("PhoneNumber")) : null,
          raw: body,
        };
        const logCallback = async (
          matched_kind: string,
          matched_id: string | null,
          outcome: string,
          note?: string,
        ) => {
          await supabaseAdmin
            .from("mpesa_callback_logs")
            .insert({ ...logRow, matched_kind, matched_id, outcome, note: note ?? null });
        };

        const { data: tx } = await supabaseAdmin
          .from("mpesa_transactions")
          .select("*")
          .eq("checkout_request_id", checkoutRequestId)
          .maybeSingle();

        if (!tx) {
          // Might be an admin test push rather than a real booking payment.
          const { data: test } = await supabaseAdmin
            .from("mpesa_test_pushes")
            .select("id")
            .eq("checkout_request_id", checkoutRequestId)
            .maybeSingle();
          if (test) {
            await supabaseAdmin
              .from("mpesa_test_pushes")
              .update({
                status: resultCode === 0 ? "confirmed" : "failed",
                result_code: resultCode,
                result_desc: resultDesc,
                mpesa_receipt: receipt ?? null,
                confirmed_at: new Date().toISOString(),
              })
              .eq("id", test.id);
            await logCallback("test_push", test.id, resultCode === 0 ? "confirmed" : "failed");
            return Response.json({ ResultCode: 0, ResultDesc: "OK" });
          }
          await logCallback(
            "unmatched",
            null,
            "unmatched",
            "No payment or test push matches this CheckoutRequestID",
          );
          return Response.json({ ResultCode: 0, ResultDesc: "Unknown ref" });
        }

        await logCallback("transaction", tx.id, resultCode === 0 ? "confirmed" : "failed");

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

          // Split the money: platform keeps commission + service fee, host gets
          // their share sent straight to their M-Pesa (best effort, idempotent).
          try {
            const { payoutHostForBooking } = await import("@/lib/mpesa/payouts.server");
            await payoutHostForBooking(tx.booking_id);
          } catch (e) {
            console.error("Host payout failed", e);
          }

          // Push the paid booking back to the partner PMS (best effort).
          try {
            const { data: bk } = await supabaseAdmin
              .from("bookings")
              .select("id,check_in,check_out,property_id,profileId,properties:property_id(title)")
              .eq("id", tx.booking_id)
              .maybeSingle();
            if (bk) {
              const { data: profile } = await supabaseAdmin
                .from("profiles")
                .select("full_name")
                .eq("id", bk.profileId)
                .maybeSingle();
              const { data: ext } = await supabaseAdmin
                .from("external_listings")
                .select("external_id")
                .eq("source", "hoteldruid")
                .eq("property_id", bk.property_id)
                .maybeSingle();
              const { createHotelDruidBooking } = await import("@/lib/sync/hoteldruid.server");
              await createHotelDruidBooking({
                room_id: ext?.external_id ?? bk.property_id,
                guest_name: profile?.full_name ?? "Kenya Stays Guest",
                guest_phone: tx.phone,
                check_in: bk.check_in,
                check_out: bk.check_out,
                payment_status: "Paid",
              });
            }
          } catch (e) {
            console.error("HotelDruid booking push failed", e);
          }
        }

        return Response.json({ ResultCode: 0, ResultDesc: "OK" });
      },
    },
  },
});
