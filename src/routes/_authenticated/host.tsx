import { createFileRoute, Link, Outlet, useRouter, useRouterState } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions, useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { myListings, toggleListingActive } from "@/lib/api/properties.functions";
import { hostBookings, updateBookingStatus } from "@/lib/api/bookings.functions";
import {
  subscribeFeatured,
  cancelFeatured,
  mySubscriptions,
  listCleaningPartners,
  setCleaningPartner,
  myAffiliateStats,
} from "@/lib/api/monetization.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { formatKES } from "@/lib/constants";
import { FEATURED_PLANS } from "@/lib/monetization";
import { Plus, Sparkles, Sparkle, Sprout, Tag, MessageCircle, CalendarDays, CheckCircle2 } from "lucide-react";
import { HostCalendar } from "@/components/HostCalendar";
import { PayoutSettingsCard } from "@/components/PayoutSettingsCard";

const listingsQO = queryOptions({ queryKey: ["my-listings"], queryFn: () => myListings() });
const bookingsQO = queryOptions({ queryKey: ["host-bookings"], queryFn: () => hostBookings() });
const subsQO = queryOptions({ queryKey: ["my-subscriptions"], queryFn: () => mySubscriptions() });
const partnersQO = queryOptions({ queryKey: ["cleaning-partners"], queryFn: () => listCleaningPartners() });
const affiliateQO = queryOptions({ queryKey: ["my-affiliate"], queryFn: () => myAffiliateStats() });

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
  const { data: subs = [] } = useQuery(subsQO);
  const { data: partners = [] } = useQuery(partnersQO);
  const { data: affiliate } = useQuery(affiliateQO);
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

  // Revenue totals from confirmed/completed bookings
  const revenueRows = bookings.filter((b: any) => ["confirmed", "completed"].includes(b.status));
  const grossRevenue = revenueRows.reduce((s: number, b: any) => s + (b.subtotal_kes ?? 0), 0);
  const commissionTaken = revenueRows.reduce((s: number, b: any) => s + (b.commission_kes ?? 0), 0);
  const netPayout = revenueRows.reduce((s: number, b: any) => s + (b.host_payout_kes ?? 0), 0);
  const todayISO = new Date().toISOString().slice(0, 10);
  const upcoming = bookings.filter((b: any) => b.check_in >= todayISO && b.status !== "cancelled");
  const pendingCount = bookings.filter((b: any) => b.status === "pending").length;

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-3xl">Host dashboard</h1>
        <Button asChild><Link to="/host/new" className="gap-1"><Plus className="size-4" /> New listing</Link></Button>
      </div>

      {/* Analytics */}
      <section className="mt-6 grid gap-3 grid-cols-2 sm:grid-cols-4">
        <div className="rounded-2xl border bg-card p-4">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><CalendarDays className="size-3.5" /> Upcoming stays</div>
          <div className="mt-1 font-serif text-2xl">{upcoming.length}</div>
        </div>
        <div className="rounded-2xl border bg-card p-4">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><CheckCircle2 className="size-3.5" /> Awaiting your reply</div>
          <div className="mt-1 font-serif text-2xl">{pendingCount}</div>
        </div>
        <div className="rounded-2xl border bg-card p-4">
          <div className="text-xs text-muted-foreground">Active listings</div>
          <div className="mt-1 font-serif text-2xl">{listings.filter((l: any) => l.is_active).length}</div>
        </div>
        <div className="rounded-2xl border bg-card p-4">
          <div className="text-xs text-muted-foreground">Next check-in</div>
          <div className="mt-1 font-serif text-lg">
            {upcoming.length
              ? new Date(upcoming.map((b: any) => b.check_in).sort()[0]).toLocaleDateString(undefined, { day: "numeric", month: "short" })
              : "—"}
          </div>
        </div>
      </section>

      {/* Booking calendar */}
      <section className="mt-6">
        <h2 className="mb-3 font-serif text-xl">Booking calendar</h2>
        <HostCalendar bookings={bookings as any} />
      </section>

      {/* Revenue summary */}
      <section className="mt-8 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border bg-card p-4">
          <div className="text-xs text-muted-foreground">Gross bookings</div>
          <div className="mt-1 font-serif text-2xl">{formatKES(grossRevenue)}</div>
        </div>
        <div className="rounded-2xl border bg-card p-4">
          <div className="text-xs text-muted-foreground">Platform commission (10%)</div>
          <div className="mt-1 font-serif text-2xl text-muted-foreground">−{formatKES(commissionTaken)}</div>
        </div>
        <div className="rounded-2xl border bg-card p-4">
          <div className="text-xs text-muted-foreground">Your payout</div>
          <div className="mt-1 font-serif text-2xl text-primary">{formatKES(netPayout)}</div>
        </div>
      </section>

      <PayoutSettingsCard />


      {/* Listings */}
      <section className="mt-8">
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
                    <div className="flex items-start justify-between gap-2">
                      <Link to="/property/$id" params={{ id: l.id }} className="font-medium hover:underline">{l.title}</Link>
                      {l.is_featured && <Badge className="gap-1 bg-primary/15 text-primary"><Sparkles className="size-3" /> Featured</Badge>}
                    </div>
                    <div className="text-sm text-muted-foreground">{l.city} · {formatKES(l.price_kes)}/night</div>
                    {l.approval_status && l.approval_status !== "approved" && (
                      <div className="mt-1">
                        <Badge variant={l.approval_status === "rejected" ? "destructive" : "secondary"}>
                          {l.approval_status === "rejected" ? "Rejected — review & resubmit" : "Pending admin approval"}
                        </Badge>
                        {l.admin_notes && <p className="mt-1 text-xs text-muted-foreground">Admin: {l.admin_notes}</p>}
                      </div>
                    )}
                    <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                      <label className="flex items-center gap-2 text-xs">
                        <Switch checked={l.is_active} onCheckedChange={(v) => toggleM.mutate({ id: l.id, is_active: v })} />
                        {l.is_active ? "Active" : "Hidden"}
                      </label>
                      <div className="flex gap-1">
                        <FeaturedDialog listing={l} />
                        <CleaningDialog listing={l} partners={partners} />
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Featured subscriptions */}
      {subs.length > 0 && (
        <section className="mt-8">
          <h2 className="font-serif text-xl">Premium placement subscriptions</h2>
          <ul className="mt-3 space-y-2">
            {subs.map((s: any) => (
              <SubRow key={s.id} sub={s} />
            ))}
          </ul>
        </section>
      )}

      {/* Bookings with commission breakdown */}
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
                      {b.profile?.full_name ?? "Guest"} · {b.profile?.phone ?? "no phone"} · {b.guests} guests
                    </div>
                    <div className="text-sm">
                      {new Date(b.check_in).toLocaleDateString()} → {new Date(b.check_out).toLocaleDateString()}
                    </div>
                    {b.affiliate_code && (
                      <div className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Tag className="size-3" /> Referred by <span className="font-mono">{b.affiliate_code}</span>
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <Badge>{b.status}</Badge>
                    <div className="mt-1 font-semibold">{formatKES(b.total_kes)}</div>
                  </div>
                </div>

                {/* Commission breakdown */}
                <dl className="mt-3 grid gap-1 rounded-lg bg-muted/40 p-3 text-xs sm:grid-cols-4">
                  <div><dt className="text-muted-foreground">Subtotal</dt><dd className="font-medium">{formatKES(b.subtotal_kes ?? 0)}</dd></div>
                  <div><dt className="text-muted-foreground">Cleaning</dt><dd className="font-medium">{formatKES(b.cleaning_fee_kes ?? 0)}</dd></div>
                  <div><dt className="text-muted-foreground">Commission (10%)</dt><dd className="font-medium text-muted-foreground">−{formatKES(b.commission_kes ?? 0)}</dd></div>
                  <div><dt className="text-muted-foreground">Your payout</dt><dd className="font-semibold text-primary">{formatKES(b.host_payout_kes ?? 0)}</dd></div>
                </dl>

                <div className="mt-3 flex flex-wrap gap-2">
                  {b.status === "pending" && (
                    <>
                      <Button size="sm" onClick={() => statusM.mutate({ id: b.id, status: "confirmed" })}>Accept &amp; confirm</Button>
                      <Button size="sm" variant="outline" onClick={() => statusM.mutate({ id: b.id, status: "cancelled" })}>Decline</Button>
                    </>
                  )}
                  {b.status === "confirmed" && new Date(b.check_out) < new Date() && (
                    <Button size="sm" variant="outline" onClick={() => statusM.mutate({ id: b.id, status: "completed" })}>Mark completed</Button>
                  )}
                  {b.profile?.phone ? (
                    <Button asChild size="sm" variant="outline" className="gap-1.5 border-acacia/40 text-acacia">
                      <a
                        href={`https://wa.me/${String(b.profile.phone).replace(/\D/g, "").replace(/^0/, "254")}?text=${encodeURIComponent(
                          `Hi ${b.profile?.full_name ?? "there"}, this is your host on Kenya Stays about your booking at ${b.properties?.title ?? "our place"} (${new Date(b.check_in).toLocaleDateString()} – ${new Date(b.check_out).toLocaleDateString()}).`,
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <MessageCircle className="size-3.5" /> Message guest
                      </a>
                    </Button>
                  ) : (
                    <span className="self-center text-xs text-muted-foreground">Guest has no phone on file</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Affiliate panel — only visible to users registered as affiliates */}
      {affiliate && <AffiliatePanel data={affiliate} />}
    </main>
  );
}

// ============ Featured Dialog ============
function FeaturedDialog({ listing }: { listing: any }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [plan, setPlan] = useState<"featured_stay" | "homepage_highlight">("featured_stay");
  const subFn = useServerFn(subscribeFeatured);
  const m = useMutation({
    mutationFn: () => subFn({ data: { property_id: listing.id, plan } }),
    onSuccess: () => {
      toast.success("Premium placement activated");
      qc.invalidateQueries({ queryKey: ["my-listings"] });
      qc.invalidateQueries({ queryKey: ["my-subscriptions"] });
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant={listing.is_featured ? "secondary" : "outline"} className="gap-1">
          <Sparkles className="size-3" /> {listing.is_featured ? "Featured" : "Feature"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Promote {listing.title}</DialogTitle>
          <DialogDescription>Boost visibility with a monthly premium placement subscription.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {Object.entries(FEATURED_PLANS).map(([key, p]) => (
            <button
              key={key}
              type="button"
              onClick={() => setPlan(key as any)}
              className={`w-full rounded-xl border p-4 text-left transition-colors ${plan === key ? "border-primary bg-primary/5" : ""}`}
            >
              <div className="flex items-center justify-between">
                <div className="font-medium">{p.label}</div>
                <div className="font-semibold">{formatKES(p.price_kes)}<span className="text-xs text-muted-foreground">/mo</span></div>
              </div>
              <div className="text-xs text-muted-foreground">{p.blurb}</div>
            </button>
          ))}
        </div>
        <DialogFooter>
          <Button onClick={() => m.mutate()} disabled={m.isPending}>
            {m.isPending ? "Activating…" : `Subscribe — ${formatKES(FEATURED_PLANS[plan].price_kes)}/mo`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============ Cleaning partner dialog ============
function CleaningDialog({ listing, partners }: { listing: any; partners: any[] }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [partnerId, setPartnerId] = useState<string>(listing.cleaning_partner_id ?? "none");
  const [fee, setFee] = useState<number>(listing.cleaning_fee_kes ?? 1500);
  const setFn = useServerFn(setCleaningPartner);
  const m = useMutation({
    mutationFn: () => setFn({
      data: {
        property_id: listing.id,
        partner_id: partnerId === "none" ? null : partnerId,
        cleaning_fee_kes: fee,
      },
    }),
    onSuccess: () => {
      toast.success("Cleaning settings saved");
      qc.invalidateQueries({ queryKey: ["my-listings"] });
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1">
          <Sprout className="size-3" /> Cleaning
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cleaning services</DialogTitle>
          <DialogDescription>Opt in to a vetted cleaning partner. Fee is added to each booking; platform takes a small cut per booking.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Partner</Label>
            <Select value={partnerId} onValueChange={setPartnerId}>
              <SelectTrigger><SelectValue placeholder="Select a partner" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No cleaning add-on</SelectItem>
                {partners.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name} — {p.city} (platform {p.platform_cut_pct}%)</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {partners.length === 0 && (
              <p className="mt-1 text-xs text-muted-foreground">No cleaning partners in your city yet. Check back soon.</p>
            )}
          </div>
          {partnerId !== "none" && (
            <div>
              <Label>Cleaning fee per booking (KES)</Label>
              <Input type="number" min={0} value={fee} onChange={(e) => setFee(+e.target.value || 0)} />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button onClick={() => m.mutate()} disabled={m.isPending}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============ Featured subscription row ============
function SubRow({ sub }: { sub: any }) {
  const qc = useQueryClient();
  const cancelFn = useServerFn(cancelFeatured);
  const m = useMutation({
    mutationFn: () => cancelFn({ data: { id: sub.id } }),
    onSuccess: () => {
      toast.success("Subscription cancelled");
      qc.invalidateQueries({ queryKey: ["my-subscriptions"] });
      qc.invalidateQueries({ queryKey: ["my-listings"] });
    },
  });
  return (
    <li className="flex items-center justify-between rounded-2xl border bg-card p-4">
      <div>
        <div className="font-medium">{sub.properties?.title ?? "Listing"} · {FEATURED_PLANS[sub.plan as keyof typeof FEATURED_PLANS]?.label ?? sub.plan}</div>
        <div className="text-xs text-muted-foreground">
          {formatKES(sub.monthly_price_kes)}/mo · renews {new Date(sub.current_period_end).toLocaleDateString()} · {sub.status}
        </div>
      </div>
      {sub.status === "active" && (
        <Button size="sm" variant="outline" onClick={() => m.mutate()}>Cancel</Button>
      )}
    </li>
  );
}

// ============ Affiliate panel ============
function AffiliatePanel({ data }: { data: { affiliate: any; referrals: any[] } }) {
  const totalPending = data.referrals.filter((r) => r.status === "pending").reduce((s, r) => s + r.commission_kes, 0);
  const totalPaid = data.referrals.filter((r) => r.status === "paid").reduce((s, r) => s + r.commission_kes, 0);
  return (
    <section className="mt-10 rounded-2xl border bg-card p-5">
      <div className="flex items-center gap-2">
        <Sparkle className="size-4 text-primary" />
        <h2 className="font-serif text-xl">Affiliate earnings</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Share your referral link and earn {data.affiliate.commission_pct}% of platform commission on every booking.
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <div className="rounded-lg border p-3"><div className="text-xs text-muted-foreground">Your code</div><div className="mt-1 font-mono text-lg">{data.affiliate.code}</div></div>
        <div className="rounded-lg border p-3"><div className="text-xs text-muted-foreground">Pending</div><div className="mt-1 font-serif text-lg">{formatKES(totalPending)}</div></div>
        <div className="rounded-lg border p-3"><div className="text-xs text-muted-foreground">Paid out</div><div className="mt-1 font-serif text-lg text-primary">{formatKES(totalPaid)}</div></div>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Share: <span className="font-mono">{typeof window !== "undefined" ? window.location.origin : ""}/?ref={data.affiliate.code}</span>
      </p>
    </section>
  );
}
