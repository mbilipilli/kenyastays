import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { myTrips } from "@/lib/api/bookings.functions";
import { Badge } from "@/components/ui/badge";
import { formatKES } from "@/lib/constants";
import { PayBookingDialog } from "@/components/PayBookingDialog";

const qo = queryOptions({ queryKey: ["my-trips"], queryFn: () => myTrips() });

export const Route = createFileRoute("/_authenticated/trips")({
  loader: ({ context }) => context.queryClient.ensureQueryData(qo),
  head: () => ({ meta: [{ title: "My trips" }] }),
  component: TripsPage,
  errorComponent: ({ error }) => <div className="p-6">{error.message}</div>,
});

const statusColor: Record<string, string> = {
  pending: "bg-amber-200 text-amber-900",
  confirmed: "bg-acacia text-accent-foreground",
  cancelled: "bg-destructive/20 text-destructive",
  completed: "bg-muted text-muted-foreground",
};

function TripsPage() {
  const { data } = useSuspenseQuery(qo);
  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="font-serif text-3xl">My trips</h1>
      {data.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed p-10 text-center text-muted-foreground">
          You haven't booked any stays yet. <Link to="/search" className="text-primary hover:underline">Find a stay</Link>
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {data.map((t: any) => (
            <li key={t.id} className="rounded-2xl border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Link to="/property/$id" params={{ id: t.properties?.id }} className="font-medium hover:underline">
                    {t.properties?.title}
                  </Link>
                  <div className="text-sm text-muted-foreground">{t.properties?.city}</div>
                  <div className="mt-1 text-sm">
                    {new Date(t.check_in).toLocaleDateString()} → {new Date(t.check_out).toLocaleDateString()} · {t.guests} guests
                  </div>
                </div>
                <div className="text-right">
                  <Badge className={statusColor[t.status] ?? ""}>{t.status}</Badge>
                  <div className="mt-2 font-semibold">{formatKES(t.total_kes)}</div>
                  {t.status === "pending" && (
                    <div className="mt-2"><PayBookingDialog bookingId={t.id} amountKes={t.total_kes} /></div>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
