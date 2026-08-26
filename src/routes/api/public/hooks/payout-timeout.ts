import { createFileRoute } from "@tanstack/react-router";
import { handleB2cTimeout } from "@/lib/mpesa/b2c-callback.server";

// Daraja B2C queue timeout callback — marks the payout for manual retry.
export const Route = createFileRoute("/api/public/hooks/payout-timeout")({
  server: {
    handlers: {
      POST: async ({ request }) => handleB2cTimeout(request),
    },
  },
});
