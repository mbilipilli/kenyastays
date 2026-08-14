import { useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { adminOverview, listAllHosts, setHostVerified, paymentsOverview, locationAccessLogs, locationAlerts, updateLocationAlertRule, addSuspiciousIp, removeSuspiciousIp, acknowledgeLocationAlert } from "@/lib/api/admin.functions";
import { testStkPush } from "@/lib/api/mpesa.functions";
import { runSync, getSyncStatus, listExternalListings } from "@/lib/api/sync.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Bed, CreditCard, TrendingUp, Users, RefreshCw, ShieldCheck, Home, Globe2, Smartphone, MapPin } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { toast } from "sonner";


export const Route = createFileRoute("/_authenticated/admin/")({
  head: () => ({ meta: [{ title: "Admin Dashboard — Kenya Stays" }] }),
  component: AdminPage,
});

const kes = (n: number) => `KES ${new Intl.NumberFormat("en-KE").format(n)}`;
const fmtDate = (s?: string | null) => (s ? new Date(s).toLocaleString() : "—");

function AdminPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const overviewFn = useServerFn(adminOverview);
  const runSyncFn = useServerFn(runSync);

  const overview = useQuery({ queryKey: ["admin", "overview"], queryFn: () => overviewFn({ data: undefined as any }) });

  const syncMut = useMutation({
    mutationFn: () => runSyncFn({ data: { source: "all" } }),
    onSuccess: () => { toast.success("Sync triggered"); qc.invalidateQueries(); },
    onError: (e: any) => toast.error(e?.message ?? "Sync failed"),
  });

  if (overview.isError) return <div className="p-8 text-destructive">You need admin access.</div>;

  const d = overview.data;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-semibold tracking-tight">Kenya Stays Admin</h1>
          <p className="text-sm text-muted-foreground">Sirvoy Pro + HotelDruid data bridge</p>
        </div>
        <Button onClick={() => syncMut.mutate()} disabled={syncMut.isPending}>
          <RefreshCw className={syncMut.isPending ? "animate-spin" : ""} /> Sync now
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={<Bed />} label="Active listings" value={d?.activeListings ?? "—"} tint="bg-primary/10 text-primary" />
        <Kpi icon={<Home />} label="Bookings today" value={d?.bookingsToday ?? "—"} tint="bg-accent/10 text-accent" />
        <Kpi icon={<TrendingUp />} label="Revenue (all-time)" value={d ? kes(d.totalRevenueKes) : "—"} tint="bg-chart-3/20 text-chart-4" />
        <Kpi
          icon={<Globe2 />}
          label="External inventory"
          value={d ? (d.syncSources.sirvoy.count + d.syncSources.hoteldruid.count) : "—"}
          tint="bg-secondary text-secondary-foreground"
        />
      </div>

      {/* Data bridge */}
      <Card className="mt-6">
        <CardHeader><CardTitle className="text-base">Central Data Bridge</CardTitle></CardHeader>
        <CardContent>
          <DataBridge sirvoy={d?.syncSources.sirvoy} hoteldruid={d?.syncSources.hoteldruid} />
        </CardContent>
      </Card>

      <Tabs defaultValue="bookings" className="mt-8">
        <TabsList className="flex flex-wrap gap-1">
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
          <TabsTrigger value="revenue">Analytics</TabsTrigger>
          <TabsTrigger value="hosts">Hosts</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="external">External inventory</TabsTrigger>
          <TabsTrigger value="sync">Sync status</TabsTrigger>
          <TabsTrigger value="location">Location audit</TabsTrigger>
        </TabsList>

        <TabsContent value="location" className="space-y-4">
          <LocationAlertsPanel />
          <LocationAuditPanel />
        </TabsContent>


        <TabsContent value="bookings">
          <Card>
            <CardHeader><CardTitle className="text-base">Recent bookings</CardTitle></CardHeader>
            <CardContent>
              <div className="divide-y">
                {(d?.recentBookings ?? []).map((b: any) => (
                  <div key={b.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                    <div>
                      <div className="font-medium">{b.properties?.title ?? "Listing"}</div>
                      <div className="text-xs text-muted-foreground">{b.properties?.city} • {b.check_in} → {b.check_out}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={b.status === "confirmed" ? "default" : "secondary"}>{b.status}</Badge>
                      <div className="font-semibold">{kes(b.total_kes)}</div>
                    </div>
                  </div>
                ))}
                {!d?.recentBookings?.length && <p className="py-6 text-center text-sm text-muted-foreground">No bookings yet</p>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue">
          <Card>
            <CardHeader><CardTitle className="text-base">Revenue — last 14 days (KES)</CardTitle></CardHeader>
            <CardContent style={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={d?.revenueSeries ?? []}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="date" stroke="currentColor" fontSize={12} />
                  <YAxis stroke="currentColor" fontSize={12} />
                  <Tooltip formatter={(v: any) => kes(Number(v))} />
                  <Line type="monotone" dataKey="kes" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hosts"><HostsPanel /></TabsContent>
        <TabsContent value="payments"><PaymentsPanel /></TabsContent>
        <TabsContent value="external"><ExternalPanel /></TabsContent>
        <TabsContent value="sync"><SyncPanel /></TabsContent>
      </Tabs>
    </div>
  );
}

function Kpi({ icon, label, value, tint }: { icon: React.ReactNode; label: string; value: any; tint: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className={`grid size-11 place-items-center rounded-xl ${tint}`}>{icon}</div>
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-2xl font-semibold">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function DataBridge({ sirvoy, hoteldruid }: { sirvoy?: { count: number; last: string | null }; hoteldruid?: { count: number; last: string | null } }) {
  return (
    <div className="grid items-center gap-4 md:grid-cols-3">
      <SourceBox name="Sirvoy Pro" tag="Channel Manager" count={sirvoy?.count ?? 0} last={sirvoy?.last ?? null} tint="from-primary/20 to-primary/5" />
      <div className="rounded-2xl border bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 p-4 text-center">
        <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Kenya Stays Bridge</div>
        <div className="flex flex-col gap-1 text-xs text-foreground/80">
          <span>← Booking Data →</span>
          <span>← Payments →</span>
          <span>← Reports →</span>
        </div>
      </div>
      <SourceBox name="HotelDruid" tag="Open Source PMS" count={hoteldruid?.count ?? 0} last={hoteldruid?.last ?? null} tint="from-accent/20 to-accent/5" />
    </div>
  );
}

function SourceBox({ name, tag, count, last, tint }: { name: string; tag: string; count: number; last: string | null; tint: string }) {
  return (
    <div className={`rounded-2xl border bg-gradient-to-br ${tint} p-4`}>
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{tag}</div>
      <div className="mt-1 text-lg font-semibold">{name}</div>
      <div className="mt-2 text-3xl font-bold">{count}</div>
      <div className="text-xs text-muted-foreground">rooms • last sync {fmtDate(last)}</div>
    </div>
  );
}

function HostsPanel() {
  const fn = useServerFn(listAllHosts);
  const verifyFn = useServerFn(setHostVerified);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["admin", "hosts"], queryFn: () => fn({ data: undefined as any }) });
  const m = useMutation({
    mutationFn: (v: { user_id: string; verified: boolean }) => verifyFn({ data: v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "hosts"] }),
  });
  return (
    <Card>
      <CardHeader><CardTitle className="text-base flex items-center gap-2"><Users className="size-4" /> Hosts</CardTitle></CardHeader>
      <CardContent>
        <div className="divide-y">
          {(data ?? []).map((h: any) => (
            <div key={h.id} className="flex items-center justify-between gap-2 py-3 text-sm">
              <div>
                <div className="font-medium">{h.full_name ?? "Unnamed host"}</div>
                <div className="text-xs text-muted-foreground">{h.phone ?? "no phone"} • {h.listing_count} listings</div>
              </div>
              <Button
                size="sm"
                variant={h.is_verified ? "secondary" : "outline"}
                onClick={() => m.mutate({ user_id: h.id, verified: !h.is_verified })}
              >
                <ShieldCheck /> {h.is_verified ? "Verified" : "Verify KYC"}
              </Button>
            </div>
          ))}
          {!data?.length && <p className="py-6 text-center text-sm text-muted-foreground">No hosts yet</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function TestStkPushCard() {
  const fn = useServerFn(testStkPush);
  const [phone, setPhone] = useState("");
  const [result, setResult] = useState<any>(null);
  const m = useMutation({
    mutationFn: () => fn({ data: { phone, amount: 1 } }),
    onSuccess: (r: any) => {
      setResult(r);
      r.ok ? toast.success("STK Push sent — check your phone") : toast.error(r.error ?? "Failed");
    },
    onError: (e: any) => {
      setResult({ ok: false, error: e?.message ?? "Request failed" });
      toast.error(e?.message ?? "Request failed");
    },
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2"><Smartphone className="size-4" /> Test STK Push</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">Sends a KES 1 sandbox prompt to your phone to verify M-Pesa credentials.</p>
        <div className="flex gap-2">
          <Input placeholder="07XX XXX XXX" value={phone} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPhone(e.target.value)} />
          <Button disabled={!phone || m.isPending} onClick={() => m.mutate()}>
            {m.isPending ? "Sending…" : "Test"}
          </Button>
        </div>
        {result && (
          <pre
            className={`overflow-x-auto rounded-lg border p-3 text-xs ${
              result.ok ? "border-primary/40 bg-primary/5" : "border-destructive/40 bg-destructive/5 text-destructive"
            }`}
          >
{JSON.stringify(result, null, 2)}
          </pre>
        )}
      </CardContent>
    </Card>
  );
}

function PaymentsPanel() {
  const fn = useServerFn(paymentsOverview);
  const { data } = useQuery({ queryKey: ["admin", "payments"], queryFn: () => fn({ data: undefined as any }) });
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><CreditCard className="size-4" /> Payments</CardTitle></CardHeader>
        <CardContent><PayList rows={data?.payments ?? []} col="method" /></CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">M-Pesa STK Push</CardTitle></CardHeader>
        <CardContent><PayList rows={data?.mpesa ?? []} col="mpesa_receipt" /></CardContent>
      </Card>
      <div className="md:col-span-2"><TestStkPushCard /></div>
    </div>
  );
}


function PayList({ rows, col }: { rows: any[]; col: string }) {
  if (!rows.length) return <p className="py-6 text-center text-sm text-muted-foreground">No activity</p>;
  return (
    <div className="divide-y">
      {rows.map((r) => (
        <div key={r.id} className="flex items-center justify-between gap-2 py-2 text-sm">
          <div>
            <div className="font-medium">{kes(r.amount_kes)} <span className="text-xs text-muted-foreground">· {r[col] ?? "—"}</span></div>
            <div className="text-xs text-muted-foreground">{fmtDate(r.created_at)}</div>
          </div>
          <Badge variant={r.status === "success" ? "default" : "secondary"}>{r.status}</Badge>
        </div>
      ))}
    </div>
  );
}

function ExternalPanel() {
  const fn = useServerFn(listExternalListings);
  const { data } = useQuery({ queryKey: ["admin", "external"], queryFn: () => fn({ data: undefined as any }) });
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">External inventory</CardTitle></CardHeader>
      <CardContent>
        <div className="divide-y">
          {(data ?? []).map((r: any) => (
            <div key={r.id} className="flex items-center justify-between gap-2 py-2 text-sm">
              <div>
                <div className="font-medium">{r.hotel_name} <span className="text-xs text-muted-foreground">· {r.room_type}</span></div>
                <div className="text-xs text-muted-foreground">{r.city ?? "—"} · {r.currency} {r.price_native}</div>
              </div>
              <div className="text-right">
                <div className="font-semibold">{kes(r.price_kes)}</div>
                <Badge variant="outline" className="text-xs">{r.source}</Badge>
              </div>
            </div>
          ))}
          {!data?.length && <p className="py-6 text-center text-sm text-muted-foreground">No synced inventory yet — click "Sync now"</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function SyncPanel() {
  const fn = useServerFn(getSyncStatus);
  const { data } = useQuery({ queryKey: ["admin", "sync"], queryFn: () => fn({ data: undefined as any }) });
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Recent sync runs</CardTitle></CardHeader>
      <CardContent>
        <div className="divide-y">
          {(data?.runs ?? []).map((r: any) => (
            <div key={r.id} className="flex items-center justify-between gap-2 py-2 text-sm">
              <div>
                <div className="font-medium capitalize">{r.source}</div>
                <div className="text-xs text-muted-foreground">{fmtDate(r.started_at)} · {r.items_upserted} items</div>
              </div>
              <Badge variant={r.status === "success" ? "default" : r.status === "error" ? "destructive" : "secondary"}>{r.status}</Badge>
            </div>
          ))}
          {!data?.runs?.length && <p className="py-6 text-center text-sm text-muted-foreground">No runs yet</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function LocationAuditPanel() {
  const fn = useServerFn(locationAccessLogs);
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "location-audit"],
    queryFn: () => fn({ data: { limit: 100 } }),
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <MapPin className="size-4" /> Exact location access log
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && <p className="py-6 text-center text-sm text-muted-foreground">Loading…</p>}
        {!isLoading && !data?.length && (
          <p className="py-6 text-center text-sm text-muted-foreground">No exact-location requests recorded yet</p>
        )}
        <div className="divide-y">
          {(data ?? []).map((r: any) => (
            <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
              <div className="min-w-0">
                <div className="font-medium">{r.action}</div>
                <div className="text-xs text-muted-foreground break-all">
                  user {r.user_id ?? "anonymous"} · {r.record_count} record(s) · {r.ip_address ?? "no IP"}
                </div>
                <div className="text-xs text-muted-foreground">{fmtDate(r.created_at)}</div>
              </div>
              <div className="flex gap-2">
                {r.exposed_address && <Badge variant="secondary">Address</Badge>}
                {r.exposed_gps && <Badge variant="secondary">GPS</Badge>}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
