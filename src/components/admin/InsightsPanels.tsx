import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { adminInsights } from "@/lib/api/admin.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { AlertTriangle, FileCheck2, PieChart, Star, Users } from "lucide-react";

const kes = (n: number) => `KES ${new Intl.NumberFormat("en-KE").format(n ?? 0)}`;

export function useInsights() {
  const fn = useServerFn(adminInsights);
  return useQuery({ queryKey: ["admin", "insights"], queryFn: () => fn({ data: undefined as any }) });
}

function StatusPill({ value }: { value: string }) {
  const tone = value === "Verified" ? "default" : value === "Submitted" ? "secondary" : "outline";
  return <Badge variant={tone as any}>{value}</Badge>;
}

export function AnalyticsPanels() {
  const { data, isLoading } = useInsights();
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader><CardTitle className="text-base">Bookings by location</CardTitle></CardHeader>
        <CardContent style={{ height: 280 }}>
          {isLoading ? <Skeleton /> : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.bookingsByCity ?? []}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="city" stroke="currentColor" fontSize={12} />
                <YAxis allowDecimals={false} stroke="currentColor" fontSize={12} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Revenue trend — last 6 months</CardTitle></CardHeader>
        <CardContent style={{ height: 280 }}>
          {isLoading ? <Skeleton /> : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data?.revenueTrend ?? []}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="label" stroke="currentColor" fontSize={12} />
                <YAxis stroke="currentColor" fontSize={12} />
                <Tooltip formatter={(v: any) => kes(Number(v))} />
                <Line type="monotone" dataKey="kes" stroke="hsl(var(--accent))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><PieChart className="size-4" /> Commissions breakdown</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <Metric label="Gross bookings" value={kes(data?.commissions.gross_kes ?? 0)} />
          <Metric label="Platform commission" value={kes(data?.commissions.commission_kes ?? 0)} />
          <Metric label="Guest service fees" value={kes(data?.commissions.service_fee_kes ?? 0)} />
          <Metric label="Cleaning fees" value={kes(data?.commissions.cleaning_fee_kes ?? 0)} />
          <Metric label="Affiliate payouts" value={kes(data?.commissions.affiliate_kes ?? 0)} />
          <Metric label="Host payouts" value={kes(data?.commissions.host_payout_kes ?? 0)} />
        </CardContent>
      </Card>
    </div>
  );
}

export function CompliancePanel() {
  const { data } = useInsights();
  const rows = data?.compliance ?? [];
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><AlertTriangle className="size-4" /> Compliance monitoring</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="divide-y">
          {rows.map((r: any, i: number) => (
            <div key={i} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
              <div>
                <div className="font-medium">{r.property}</div>
                <div className="text-xs text-muted-foreground">{r.city} • {r.issue}</div>
              </div>
              <Badge variant={r.severity === "high" ? "destructive" : "secondary"}>
                {r.severity === "high" ? "Suspend / review" : "Review"}
              </Badge>
            </div>
          ))}
          {!rows.length && <p className="py-6 text-center text-sm text-muted-foreground">No compliance issues detected</p>}
        </div>
      </CardContent>
    </Card>
  );
}

export function DocumentVerificationPanel() {
  const { data } = useInsights();
  const rows = data?.documentQueue ?? [];
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><FileCheck2 className="size-4" /> Document verification</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
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
      </CardContent>
    </Card>
  );
}

export function HostManagementPanel() {
  const { data } = useInsights();
  const rows = data?.hostManagement ?? [];
  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Users className="size-4" /> Host management</CardTitle></CardHeader>
      <CardContent className="overflow-x-auto">
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
      </CardContent>
    </Card>
  );
}

export function GuestInsightsPanel() {
  const { data } = useInsights();
  const g = data?.guestInsights;
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Guest insights</CardTitle></CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-4">
        <Metric label="Average rating" value={g?.avgRating != null ? String(g.avgRating) : "—"} />
        <Metric label="Repeat guests" value={`${g?.repeatPct ?? 0}%`} />
        <Metric label="Feedback sentiment" value={g?.sentiment ?? "—"} />
        <Metric label="Guests booked" value={String(g?.totalGuests ?? 0)} />
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-muted/30 p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
    </div>
  );
}

function Skeleton() {
  return <div className="h-full w-full animate-pulse rounded-xl bg-muted" />;
}
