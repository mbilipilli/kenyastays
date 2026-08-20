import { createFileRoute } from "@tanstack/react-router";

// Primary Daraja STK callback endpoint. Safaricom's validator rejects callback
// URLs containing blocked words such as "mpesa", hence the neutral path.
export const Route = createFileRoute("/api/public/hooks/pay-callback")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { handleDarajaCallback } = await import("@/lib/mpesa/callback.server");
        return handleDarajaCallback(request);
      },
    },
  },
});
