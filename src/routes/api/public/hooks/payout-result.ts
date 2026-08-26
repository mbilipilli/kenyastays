import { createFileRoute } from "@tanstack/react-router";
import { handleB2cResult } from "@/lib/mpesa/b2c-callback.server";

// Daraja B2C result callback (neutral path — Safaricom blocks paths containing
// "mpesa"). Authenticated by matching ConversationID against a host_payouts row.
export const Route = createFileRoute("/api/public/hooks/payout-result")({
  server: {
    handlers: {
      POST: async ({ request }) => handleB2cResult(request),
    },
  },
});
