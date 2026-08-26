import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Banknote, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatKES } from "@/lib/constants";
import { listMyPayouts, getPayoutSettings } from "@/lib/api/payouts.functions";

export const Route = createFileRoute("/_authenticated/payouts")({
  head: () => ({
    meta: [
      { title: "Payout status — Kenya Stays" },
      {
        name: "description",
        content:
          "Track every M-Pesa payout for your Kenya Stays bookings: payment reference, amount, status and any error details.",
      },
      { property: "og:title", content: "Payout status — Kenya Stays" },
      {
        property: "og:description",
        content: "See the latest M-Pesa payout reference, amount, status and error details for your listings.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PayoutStatusPage,
});

const TONE: Record<string, string> = {
  paid: "bg-primary/15 text-primary",
  sent: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  pending_manual: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  failed: "bg-destructive/15 text-destructive",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="secondary" className={TONE[status] ?? "bg-muted text-muted-foreground"}>
      {status.replace("_", " ")}
    </Badge>
  );
}

function PayoutStatusPage() {
  const listFn = useServerFn(listMyPayouts);
  const settingsFn = useServerFn(getPayoutSettings);

  const { data: payouts = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ["my-payouts", "full"],
    queryFn: () => listFn({}),
  });
  const { data: settings } = useQuery({ queryKey: ["payout-settings"], queryFn: () => settingsFn({}) });

  const latest = payouts[0];
  const totalPaid = payouts
    .filter((p: any) => p.status === "paid")
    .reduce((sum: number, p: any) => sum + (p.amount_kes ?? 0), 0);

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link to="/host">
          <ArrowLeft /> Back to host dashboard
        </Link>
      </Button>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl font-semibold tracking-tight">Payout status</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every M-Pesa disbursement for your bookings, with its payment reference, amount, status and
            error details when something goes wrong.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={isFetching ? "animate-spin" : ""} /> Refresh
        </Button>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Last payment reference</p>
          <p className="mt-1 font-mono text-lg">{latest?.mpesa_receipt ?? "—"}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {latest ? new Date(latest.created_at).toLocaleString("en-KE") : "No payouts yet"}
          </p>
        </div>
        <div className="rounded-2xl border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Last amount</p>
          <p className="mt-1 text-lg font-semibold">{latest ? formatKES(latest.amount_kes) : "—"}</p>
          <div className="mt-1">{latest ? <StatusBadge status={latest.status} /> : null}</div>
        </div>
        <div className="rounded-2xl border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Total paid out</p>
          <p className="mt-1 text-lg font-semibold">{formatKES(totalPaid)}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            To {settings?.payout_phone ?? settings?.phone ?? "no number saved"}
          </p>
        </div>
      </div>

      <section className="mt-6 rounded-2xl border bg-card">
        <div className="flex items-center gap-2 border-b p-4">
          <Banknote className="size-4 text-primary" />
          <h2 className="font-serif text-xl">Payout history</h2>
        </div>

        {isLoading ? (
          <p className="p-4 text-sm text-muted-foreground">Loading payouts…</p>
        ) : payouts.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">
            No payouts yet. Once a guest pays for a stay, your share is sent to your M-Pesa number and
            appears here.
          </p>
        ) : (
          <ul className="divide-y">
            {payouts.map((p: any) => (
              <li key={p.id} className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{formatKES(p.amount_kes)}</p>
                    <p className="text-xs text-muted-foreground">
                      Booking {String(p.booking_id).slice(0, 8)} ·{" "}
                      {new Date(p.created_at).toLocaleString("en-KE")}
                    </p>
                  </div>
                  <StatusBadge status={p.status} />
                </div>
                <dl className="mt-2 grid gap-x-6 gap-y-1 text-xs sm:grid-cols-2">
                  <div className="flex gap-2">
                    <dt className="text-muted-foreground">Reference</dt>
                    <dd className="font-mono">{p.mpesa_receipt ?? "—"}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="text-muted-foreground">Sent to</dt>
                    <dd className="font-mono">{p.phone ?? "—"}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="text-muted-foreground">Conversation ID</dt>
                    <dd className="truncate font-mono">
                      {p.conversation_id ?? p.originator_conversation_id ?? "—"}
                    </dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="text-muted-foreground">Result code</dt>
                    <dd className="font-mono">{p.result_code ?? "—"}</dd>
                  </div>
                </dl>
                {p.result_desc && p.status !== "paid" ? (
                  <p className="mt-2 rounded-lg bg-destructive/10 p-2 text-xs text-destructive">
                    {p.result_desc}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
