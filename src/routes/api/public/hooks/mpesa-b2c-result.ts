import { createFileRoute } from "@tanstack/react-router";
import { handleB2cResult } from "@/lib/mpesa/b2c-callback.server";

// Legacy alias — new payouts use /api/public/hooks/payout-result.
export const Route = createFileRoute("/api/public/hooks/mpesa-b2c-result")({
  server: {
    handlers: {
      POST: async ({ request }) => handleB2cResult(request),
    },
  },
});
