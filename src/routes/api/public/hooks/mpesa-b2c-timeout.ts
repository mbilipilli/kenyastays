import { createFileRoute } from "@tanstack/react-router";

// Daraja B2C queue timeout callback — marks the payout for manual retry.
export const Route = createFileRoute("/api/public/hooks/mpesa-b2c-timeout")({
  server: {
    handlers: {
      POST: async ({ request }) => {
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
      },
    },
  },
});
