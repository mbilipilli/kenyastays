import { createFileRoute, Link } from "@tanstack/react-router";
import { StkLedger } from "@/components/admin/StkLedger";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/mpesa-logs")({
  head: () => ({
    meta: [
      { title: "STK push logs — Kenya Stays Admin" },
      {
        name: "description",
        content:
          "Admin ledger of every M-Pesa STK push request with its callback events, response codes and timestamps.",
      },
      { property: "og:title", content: "STK push logs — Kenya Stays Admin" },
      {
        property: "og:description",
        content: "Track M-Pesa STK push requests, callbacks and response codes in one place.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MpesaLogsPage,
});

function MpesaLogsPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link to="/admin">
          <ArrowLeft /> Back to admin
        </Link>
      </Button>
      <h1 className="font-serif text-3xl font-semibold tracking-tight">STK push logs</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Every M-Pesa STK push we sent — booking payments and admin test pushes — together with the
        Daraja callbacks it produced, their response codes and timestamps. Callbacks that matched no
        request appear as "callback only" so you can spot stale references quickly.
      </p>
      <div className="mt-6">
        <StkLedger />
      </div>
    </main>
  );
}
