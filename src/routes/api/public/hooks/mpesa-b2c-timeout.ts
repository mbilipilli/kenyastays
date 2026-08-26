import { createFileRoute } from "@tanstack/react-router";
import { handleB2cTimeout } from "@/lib/mpesa/b2c-callback.server";

// Legacy alias — new payouts use /api/public/hooks/payout-timeout.
export const Route = createFileRoute("/api/public/hooks/mpesa-b2c-timeout")({
  server: {
    handlers: {
      POST: async ({ request }) => handleB2cTimeout(request),
    },
  },
});
