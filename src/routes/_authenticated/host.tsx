import { createFileRoute, Link, Outlet, useRouter, useRouterState } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { myListings, toggleListingActive } from "@/lib/api/properties.functions";
import { hostBookings, updateBookingStatus } from "@/lib/api/bookings.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { formatKES } from "@/lib/constants";
import { Plus } from "lucide-react";

const listingsQO = queryOptions({ queryKey: ["my-listings"], queryFn: () => myListings() });
const bookingsQO = queryOptions({ queryKey: ["host-bookings"], queryFn: () => hostBookings() });

export const Route = createFileRoute("/_authenticated/host")({
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(listingsQO),
      context.queryClient.ensureQueryData(bookingsQO),
    ]),
  head: () => ({ meta: [{ title: "Host dashboard" }] }),
  component: HostShell,
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <div className="p-6">
        <p>{error.message}</p>
        <Button className="mt-3" onClick={() => { router.invalidate(); reset(); }}>Try again</Button>
      </div>
    );
  },
  notFoundComponent: () => <div className="p-6">Host dashboard not found.</div>,
});

function HostShell() {
  const isNewListingRoute = useRouterState({ select: (s) => s.location.pathname === "/host/new" });
  return isNewListingRoute ? <Outlet /> : <HostDashboard />;
}

function HostDashboard() {
  const { data: listings } = useSuspenseQuery(listingsQO);
  const { data: bookings } = useSuspenseQuery(bookingsQO);
  const qc = useQueryClient();

  const toggleFn = useServerFn(toggleListingActive);
  const toggleM = useMutation({
    mutationFn: (v: { id: string; is_active: boolean }) => toggleFn({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-listings"] }),
  });

  const statusFn = useServerFn(updateBookingStatus);
  const statusM = useMutation({
    mutationFn: (v: { id: string; status: "confirmed" | "cancelled" | "completed" }) => statusFn({ data: v }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["host-bookings"] }); toast.success("Updated"); },
  });

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-3xl">Host dashboard</h1>
        <Button asChild><Link to="/host/new" className="gap-1"><Plus className="size-4" /> New listing</Link></Button>
      </div>

      <section className="mt-6">
        <h2 className="font-serif text-xl">Your listings ({listings.length})</h2>
        {listings.length === 0 ? (
          <div className="mt-3 rounded-2xl border border-dashed p-10 text-center text-muted-foreground">
            No listings yet. <Link to="/host/new" className="text-primary">Create your first listing</Link>
          </div>
        ) : (
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {listings.map((l: any) => (
              <li key={l.id} className="overflow-hidden rounded-2xl border bg-card">
                <div className="flex">
                  <div className="aspect-square w-28 shrink-0 bg-muted">
                    {l.cover_url && <img src={l.cover_url} alt={l.title} className="size-full object-cover" />}
                  </div>
                  <div className="flex flex-1 flex-col p-3">
                    <Link to="/property/$id" params={{ id: l.id }} className="font-medium hover:underline">{l.title}</Link>
                    <div className="text-sm text-muted-foreground">{l.city} · {formatKES(l.price_kes)}/night</div>
                    <div className="mt-auto flex items-center justify-between pt-2">
                      <label className="flex items-center gap-2 text-xs">
                        <Switch checked={l.is_active} onCheckedChange={(v) => toggleM.mutate({ id: l.id, is_active: v })} />
                        {l.is_active ? "Active" : "Hidden"}
                      </label>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <h2 className="font-serif text-xl">Incoming bookings ({bookings.length})</h2>
        {bookings.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No bookings yet.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {bookings.map((b: any) => (
              <li key={b.id} className="rounded-2xl border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-medium">{b.properties?.title}</div>
                    <div className="text-sm text-muted-foreground">
                      {b.profiles?.full_name ?? "Guest"} · {b.profiles?.phone ?? "no phone"} · {b.guests} guests
                    </div>
                    <div className="text-sm">
                      {new Date(b.check_in).toLocaleDateString()} → {new Date(b.check_out).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge>{b.status}</Badge>
                    <div className="mt-1 font-semibold">{formatKES(b.total_kes)}</div>
                  </div>
                </div>
                {b.status === "pending" && (
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" onClick={() => statusM.mutate({ id: b.id, status: "confirmed" })}>Accept</Button>
                    <Button size="sm" variant="outline" onClick={() => statusM.mutate({ id: b.id, status: "cancelled" })}>Decline</Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
