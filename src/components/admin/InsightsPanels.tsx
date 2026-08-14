import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { adminInsights, reviewListing } from "@/lib/api/admin.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Cell,
} from "recharts";
import {
  AlertTriangle, FileCheck2, LifeBuoy, PieChart, Star, Users, Wallet, MapPinned, TrendingUp,
} from "lucide-react";

const kes = (n: number) => `KES ${new Intl.NumberFormat("en-KE").format(n ?? 0)}`;

export function useInsights() {
  const fn = useServerFn(adminInsights);
  return useQuery({ queryKey: ["admin", "insights"], queryFn: () => fn({ data: undefined as any }) });
}

function StatusPill({ value }: { value: string }) {
  if (value === "Verified") return <Badge className="bg-success text-success-foreground">Verified</Badge>;
  if (value === "Rejected") return <Badge variant="destructive">Rejected</Badge>;
  if (value === "Submitted") return <Badge variant="secondary">Submitted</Badge>;
  return <Badge variant="outline">Pending</Badge>;
}

function SectionCard({
  icon, title, subtitle, children, className,
}: { icon: React.ReactNode; title: string; subtitle?: string; children: React.ReactNode; className?: string }) {
  return (
    <Card className={`border-admin/15 shadow-sm ${className ?? ""}`}>
      <CardHeader className="gap-1">
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="grid size-8 place-items-center rounded-lg bg-admin/10 text-admin">{icon}</span>
          {title}
        </CardTitle>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function AnalyticsPanels() {
  const { data, isLoading } = useInsights();
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <SectionCard icon={<MapPinned className="size-4" />} title="Bookings by location">
        <div style={{ height: 260 }}>
          {isLoading ? <Skeleton /> : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.bookingsByCity ?? []}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                <XAxis dataKey="city" stroke="currentColor" fontSize={12} />
                <YAxis allowDecimals={false} stroke="currentColor" fontSize={12} />
                <Tooltip />
                <Bar dataKey="count" fill="var(--admin)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </SectionCard>

      <SectionCard
        icon={<TrendingUp className="size-4" />}
        title="Top locations by occupancy"
        subtitle="Nights sold vs available nights, last 30 days"
      >
        <div style={{ height: 260 }}>
          {isLoading ? <Skeleton /> : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.occupancyByCity ?? []} layout="vertical" margin={{ left: 24 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                <XAxis type="number" domain={[0, 100]} unit="%" stroke="currentColor" fontSize={12} />
                <YAxis type="category" dataKey="city" width={90} stroke="currentColor" fontSize={12} />
                <Tooltip formatter={(v: any) => `${v}% occupancy`} />
                <Bar dataKey="occupancy" radius={[0, 6, 6, 0]}>
                  {(data?.occupancyByCity ?? []).map((row: any, i: number) => (
                    <Cell key={i} fill={row.occupancy >= 60 ? "var(--success)" : row.occupancy >= 35 ? "var(--admin)" : "var(--chart-3)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </SectionCard>

      <SectionCard icon={<Wallet className="size-4" />} title="Revenue trend — last 6 months" className="lg:col-span-2">
        <div style={{ height: 260 }}>
          {isLoading ? <Skeleton /> : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data?.revenueTrend ?? []}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                <XAxis dataKey="label" stroke="currentColor" fontSize={12} />
                <YAxis stroke="currentColor" fontSize={12} />
                <Tooltip formatter={(v: any) => kes(Number(v))} />
                <Line type="monotone" dataKey="kes" stroke="var(--admin)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </SectionCard>
    </div>
  );
}

export function CommissionsPanel() {
  const { data, isLoading } = useInsights();
  const c = data?.commissions;
  const methods = data?.commissionByMethod ?? [];
  const platformTotal = (c?.commission_kes ?? 0) + (c?.service_fee_kes ?? 0);

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <SectionCard
        icon={<PieChart className="size-4" />}
        title="Commissions earned"
        subtitle="Platform take across all confirmed bookings"
        className="lg:col-span-3"
      >
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <Metric label="Total platform earnings" value={kes(platformTotal)} highlight />
          <Metric label="Gross bookings" value={kes(c?.gross_kes ?? 0)} />
          <Metric label="Host commission (10%)" value={kes(c?.commission_kes ?? 0)} />
          <Metric label="Guest service fees (4%)" value={kes(c?.service_fee_kes ?? 0)} />
          <Metric label="Cleaning fees" value={kes(c?.cleaning_fee_kes ?? 0)} />
          <Metric label="Affiliate payouts" value={kes(c?.affiliate_kes ?? 0)} />
        </div>
      </SectionCard>

      <SectionCard icon={<Wallet className="size-4" />} title="By payment method">
        <div className="space-y-3">
          {methods.map((m: any) => {
            const pct = platformTotal ? Math.round((m.commission_kes / platformTotal) * 100) : 0;
            return (
              <div key={m.method}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{m.method}</span>
                  <span className="font-semibold">{kes(m.commission_kes)}</span>
                </div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-admin-muted">
                  <div className="h-full rounded-full bg-admin" style={{ width: `${pct}%` }} />
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {m.count} payment(s) • {kes(m.volume_kes)} processed • {pct}% of earnings
                </div>
              </div>
            );
          })}
          {!methods.length && <p className="py-6 text-center text-sm text-muted-foreground">No settled payments yet</p>}
        </div>
      </SectionCard>

      <SectionCard icon={<TrendingUp className="size-4" />} title="Monthly commission trend" className="lg:col-span-2">
        <div style={{ height: 240 }}>
          {isLoading ? <Skeleton /> : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.commissionTrend ?? []}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                <XAxis dataKey="label" stroke="currentColor" fontSize={12} />
                <YAxis stroke="currentColor" fontSize={12} />
                <Tooltip formatter={(v: any) => kes(Number(v))} />
                <Bar dataKey="kes" fill="var(--admin)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </SectionCard>
    </div>
  );
}

export function CompliancePanel() {
  const { data } = useInsights();
  const qc = useQueryClient();
  const reviewFn = useServerFn(reviewListing);
  const rows = data?.compliance ?? [];

  const suspend = useMutation({
    mutationFn: (id: string) => reviewFn({ data: { id, decision: "rejected", notes: "Suspended by compliance monitoring" } }),
    onSuccess: () => {
      toast.success("Listing suspended and removed from search");
      qc.invalidateQueries({ queryKey: ["admin"] });
      qc.invalidateQueries({ queryKey: ["listings-review"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not suspend listing"),
  });

  return (
    <SectionCard
      icon={<AlertTriangle className="size-4" />}
      title="Compliance monitoring"
      subtitle="Suspicious listings and policy violations flagged automatically"
    >
      <div className="divide-y">
        {rows.map((r: any, i: number) => (
          <div key={i} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
            <div className="min-w-0">
              <div className="flex items-center gap-2 font-medium">
                {r.property}
                <Badge variant={r.severity === "high" ? "destructive" : "secondary"} className="capitalize">{r.severity}</Badge>
              </div>
              <div className="text-xs text-muted-foreground">{r.city} • {r.issue}</div>
            </div>
            <div className="flex gap-2">
              {r.id && (
                <Button asChild size="sm" variant="outline">
                  <Link to="/property/$id" params={{ id: r.id }}>Review</Link>
                </Button>
              )}
              {r.id && (
                <Button size="sm" variant="destructive" disabled={suspend.isPending} onClick={() => suspend.mutate(r.id)}>
                  Suspend
                </Button>
              )}
            </div>
          </div>
        ))}
        {!rows.length && <p className="py-6 text-center text-sm text-muted-foreground">No compliance issues detected</p>}
      </div>
    </SectionCard>
  );
}

export function DocumentVerificationPanel() {
  const { data } = useInsights();
  const rows = data?.documentQueue ?? [];
  return (
    <SectionCard
      icon={<FileCheck2 className="size-4" />}
      title="Document verification"
      subtitle="ID, KRA PIN and proof of ownership submitted by hosts"
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr><th className="py-2">Host</th><th>ID</th><th>KRA PIN</th><th>Proof of ownership</th></tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((r: any) => (
              <tr key={r.id}>
                <td className="py-3 font-medium">{r.name}</td>
                <td><StatusPill value={r.id_status} /></td>
                <td><StatusPill value={r.kra_status} /></td>
                <td><StatusPill value={r.ownership_status} /></td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={4} className="py-6 text-center text-muted-foreground">All host documents verified</td></tr>}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}

export function HostManagementPanel() {
  const { data } = useInsights();
  const rows = data?.hostManagement ?? [];
  return (
    <SectionCard icon={<Users className="size-4" />} title="Host management" subtitle="Performance metrics across all hosts">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr><th className="py-2">Host</th><th>Listings</th><th>Earnings</th><th>Rating</th><th>Cancellations</th></tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((h: any) => (
              <tr key={h.id}>
                <td className="py-3">
                  <div className="font-medium">{h.name}</div>
                  {h.verified && <div className="text-xs text-muted-foreground">Verified host</div>}
                </td>
                <td>{h.listings}</td>
                <td className="font-semibold">{kes(h.earnings_kes)}</td>
                <td>{h.rating != null ? <span className="inline-flex items-center gap-1"><Star className="size-3 fill-current" />{h.rating}</span> : "—"}</td>
                <td>{h.cancellations}</td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={5} className="py-6 text-center text-muted-foreground">No hosts yet</td></tr>}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}

export function EscalationsPanel() {
  const { data } = useInsights();
  const rows = data?.escalations ?? [];
  return (
    <SectionCard icon={<LifeBuoy className="size-4" />} title="Escalation panel" subtitle="Disputes and host issues needing admin follow-up">
      <div className="divide-y">
        {rows.map((e: any) => (
          <div key={e.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
            <div className="min-w-0">
              <div className="flex items-center gap-2 font-medium">
                {e.name}
                <Badge variant={e.severity === "high" ? "destructive" : "secondary"} className="capitalize">{e.severity}</Badge>
              </div>
              <div className="text-xs text-muted-foreground">{e.reason} • {e.listings} listing(s) • {kes(e.earnings_kes)} earned</div>
            </div>
            <Button size="sm" variant="outline" onClick={() => toast.success(`Escalation opened for ${e.name}`)}>
              Open case
            </Button>
          </div>
        ))}
        {!rows.length && <p className="py-6 text-center text-sm text-muted-foreground">No open escalations</p>}
      </div>
    </SectionCard>
  );
}

export function GuestInsightsPanel() {
  const { data } = useInsights();
  const g = data?.guestInsights;
  return (
    <SectionCard icon={<Star className="size-4" />} title="Guest insights" subtitle="Ratings, repeat guests and feedback sentiment">
      <div className="grid gap-4 sm:grid-cols-4">
        <Metric label="Average rating" value={g?.avgRating != null ? String(g.avgRating) : "—"} highlight />
        <Metric label="Repeat guests" value={`${g?.repeatPct ?? 0}%`} />
        <Metric label="Feedback sentiment" value={g?.sentiment ?? "—"} />
        <Metric label="Guests booked" value={String(g?.totalGuests ?? 0)} />
      </div>
    </SectionCard>
  );
}

function Metric({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${highlight ? "border-admin/30 bg-admin/5" : "bg-admin-muted/40"}`}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-1 text-lg font-semibold ${highlight ? "text-admin" : ""}`}>{value}</div>
    </div>
  );
}

function Skeleton() {
  return <div className="h-full w-full animate-pulse rounded-xl bg-muted" />;
}
