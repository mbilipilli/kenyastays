import { useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { adminOverview, listAllHosts, setHostVerified, paymentsOverview, locationAccessLogs, locationAlerts, updateLocationAlertRule, addSuspiciousIp, removeSuspiciousIp, acknowledgeLocationAlert, listingsForReview, reviewListing } from "@/lib/api/admin.functions";
import { testStkPush } from "@/lib/api/mpesa.functions";
import { runSync, getSyncStatus, listExternalListings } from "@/lib/api/sync.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Bed, CreditCard, TrendingUp, Users, RefreshCw, ShieldCheck, Home, Globe2, Smartphone, MapPin, ClipboardCheck, Check, X } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { toast } from "sonner";
import { AnalyticsPanels, CommissionsPanel, CompliancePanel, DocumentVerificationPanel, EscalationsPanel, GuestInsightsPanel, HostManagementPanel } from "@/components/admin/InsightsPanels";



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
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-admin/15 bg-admin-surface p-6 shadow-sm">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-admin px-3 py-1 text-xs font-semibold uppercase tracking-wide text-admin-foreground shadow">
            <ShieldCheck className="size-3.5" /> Admin dashboard
          </div>
          <h1 className="font-serif text-3xl font-semibold tracking-tight">Kenya Stays Admin</h1>
          <p className="text-sm text-muted-foreground">Oversight and compliance only — this account has no hosting rights</p>
        </div>
        <Button onClick={() => syncMut.mutate()} disabled={syncMut.isPending} className="bg-admin text-admin-foreground hover:bg-admin/90">
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

      <Tabs defaultValue="approvals" className="mt-8">
        <TabsList className="flex flex-wrap gap-1">
          <TabsTrigger value="approvals">Approvals</TabsTrigger>
          <TabsTrigger value="verification">Verification</TabsTrigger>
          <TabsTrigger value="revenue">Analytics</TabsTrigger>
          <TabsTrigger value="commissions">Commissions</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="hosts">Hosts</TabsTrigger>
          <TabsTrigger value="guests">Guest insights</TabsTrigger>
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="external">External inventory</TabsTrigger>
          <TabsTrigger value="sync">Sync status</TabsTrigger>
          <TabsTrigger value="location">Location audit</TabsTrigger>
        </TabsList>

        <TabsContent value="verification"><DocumentVerificationPanel /></TabsContent>
        <TabsContent value="commissions"><CommissionsPanel /></TabsContent>
        <TabsContent value="compliance"><CompliancePanel /></TabsContent>
        <TabsContent value="guests"><GuestInsightsPanel /></TabsContent>


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
                  <Line type="monotone" dataKey="kes" stroke="var(--admin)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <div className="mt-4"><AnalyticsPanels /></div>
        </TabsContent>

        <TabsContent value="approvals"><ApprovalsPanel /></TabsContent>
        <TabsContent value="hosts" className="space-y-4"><HostManagementPanel /><EscalationsPanel /><HostsPanel /></TabsContent>

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

function LocationAlertsPanel() {
  const load = useServerFn(locationAlerts);
  const saveRule = useServerFn(updateLocationAlertRule);
  const addIp = useServerFn(addSuspiciousIp);
  const removeIp = useServerFn(removeSuspiciousIp);
  const ack = useServerFn(acknowledgeLocationAlert);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "location-alerts"],
    queryFn: () => load({ data: { limit: 100 } }),
  });

  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [win, setWin] = useState("");
  const [max, setMax] = useState("");
  const [ip, setIp] = useState("");
  const [note, setNote] = useState("");

  const rule = data?.rule as any;
  const isEnabled = enabled ?? rule?.enabled ?? true;
  const winVal = win || String(rule?.window_minutes ?? 15);
  const maxVal = max || String(rule?.max_requests ?? 20);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin", "location-alerts"] });

  const ruleMut = useMutation({
    mutationFn: () =>
      saveRule({
        data: { enabled: isEnabled, window_minutes: Number(winVal), max_requests: Number(maxVal) },
      }),
    onSuccess: () => { toast.success("Alert rule saved"); invalidate(); },
    onError: (e: any) => toast.error(e?.message ?? "Could not save rule"),
  });
  const addMut = useMutation({
    mutationFn: () => addIp({ data: { ip_prefix: ip, note: note || undefined } }),
    onSuccess: () => { toast.success("IP added to watchlist"); setIp(""); setNote(""); invalidate(); },
    onError: (e: any) => toast.error(e?.message ?? "Could not add IP"),
  });
  const rmMut = useMutation({
    mutationFn: (id: string) => removeIp({ data: { id } }),
    onSuccess: invalidate,
  });
  const ackMut = useMutation({
    mutationFn: (id: string) => ack({ data: { id } }),
    onSuccess: invalidate,
  });

  const open = (data?.alerts ?? []).filter((a: any) => !a.acknowledged_at);

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="size-4" /> Location alerts
            {open.length > 0 && <Badge variant="destructive">{open.length} open</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="py-6 text-center text-sm text-muted-foreground">Loading…</p>}
          {!isLoading && !data?.alerts?.length && (
            <p className="py-6 text-center text-sm text-muted-foreground">No alerts raised — all clear</p>
          )}
          <div className="divide-y">
            {(data?.alerts ?? []).map((a: any) => (
              <div key={a.id} className="flex flex-wrap items-start justify-between gap-2 py-3 text-sm">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 font-medium">
                    {a.kind === "threshold" ? "Request threshold exceeded" : "Suspicious IP"}
                    {a.acknowledged_at ? (
                      <Badge variant="secondary">Acknowledged</Badge>
                    ) : (
                      <Badge variant="destructive">Open</Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground break-all">{a.details}</div>
                  <div className="text-xs text-muted-foreground break-all">
                    user {a.user_id ?? "anonymous"} · {a.ip_address ?? "no IP"} · {a.action ?? "—"} · {fmtDate(a.created_at)}
                  </div>
                </div>
                {!a.acknowledged_at && (
                  <Button size="sm" variant="outline" onClick={() => ackMut.mutate(a.id)} disabled={ackMut.isPending}>
                    Acknowledge
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Threshold rule</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span>Alerting enabled</span>
              <Button size="sm" variant={isEnabled ? "default" : "outline"} onClick={() => setEnabled(!isEnabled)}>
                {isEnabled ? "On" : "Off"}
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground">Window (min)</label>
                <Input value={winVal} onChange={(e) => setWin(e.target.value)} inputMode="numeric" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Max requests</label>
                <Input value={maxVal} onChange={(e) => setMax(e.target.value)} inputMode="numeric" />
              </div>
            </div>
            <Button className="w-full" onClick={() => ruleMut.mutate()} disabled={ruleMut.isPending}>
              Save rule
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Suspicious IP watchlist</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="IP or prefix e.g. 41.90." value={ip} onChange={(e) => setIp(e.target.value)} />
            <Input placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
            <Button className="w-full" variant="outline" onClick={() => addMut.mutate()} disabled={!ip.trim() || addMut.isPending}>
              Add to watchlist
            </Button>
            <div className="divide-y">
              {(data?.suspiciousIps ?? []).map((r: any) => (
                <div key={r.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                  <div className="min-w-0">
                    <div className="font-medium break-all">{r.ip_prefix}</div>
                    {r.note && <div className="text-xs text-muted-foreground break-all">{r.note}</div>}
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => rmMut.mutate(r.id)}>Remove</Button>
                </div>
              ))}
              {!data?.suspiciousIps?.length && (
                <p className="py-2 text-xs text-muted-foreground">No IPs on the watchlist</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatusTracker({ status }: { status: string }) {
  const steps = ["pending", "approved", "rejected"];
  return (
    <div className="flex items-center gap-2 text-xs">
      {steps.map((st) => (
        <span
          key={st}
          className={
            "rounded-full border px-2 py-0.5 capitalize " +
            (st === status
              ? st === "approved"
                ? "border-transparent bg-primary text-primary-foreground"
                : st === "rejected"
                  ? "border-transparent bg-destructive text-destructive-foreground"
                  : "border-transparent bg-secondary text-secondary-foreground"
              : "text-muted-foreground")
          }
        >
          {st}
        </span>
      ))}
    </div>
  );
}

function ApprovalsPanel() {
  const listFn = useServerFn(listingsForReview);
  const reviewFn = useServerFn(reviewListing);
  const qc = useQueryClient();
  const [status, setStatus] = useState<"pending" | "approved" | "rejected">("pending");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const q = useQuery({ queryKey: ["listings-review", status], queryFn: () => listFn({ data: { status } }) });

  const review = useMutation({
    mutationFn: (v: { id: string; decision: "approved" | "rejected" }) =>
      reviewFn({ data: { ...v, notes: notes[v.id] || undefined } }),
    onSuccess: (r: any) => {
      toast.success(r.status === "approved" ? "Listing approved — host notified" : "Listing rejected — host notified");
      qc.invalidateQueries({ queryKey: ["listings-review"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card className="border-admin/15 shadow-sm">
      <CardHeader className="gap-1">
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="grid size-8 place-items-center rounded-lg bg-admin/10 text-admin"><ClipboardCheck className="size-4" /></span>
          Host Approval Panel
        </CardTitle>
        <p className="text-sm text-muted-foreground">Review host submissions before activation.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          {(["pending", "approved", "rejected"] as const).map((s) => (
            <Button key={s} size="sm" variant={s === status ? "default" : "outline"} onClick={() => setStatus(s)} className="capitalize">
              {s}
            </Button>
          ))}
        </div>
        {q.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {q.data?.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Nothing here.</p>}
        <div className="space-y-3">
          {(q.data ?? []).map((r: any) => (
            <div key={r.id} className="rounded-xl border border-admin/15 bg-admin-surface p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="text-sm">
                  <div className="text-xs text-muted-foreground">Host Name</div>
                  <div className="font-medium">{r.host_name}</div>
                  <div className="mt-2 text-xs text-muted-foreground">Property Title</div>
                  <div className="font-medium">{r.title}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{r.city} • {kes(r.price_kes)}/night</div>
                </div>
                <div className="space-y-2 text-right">
                  <div className="text-xs text-muted-foreground">Documents Verified</div>
                  {r.host_verified
                    ? <Badge className="bg-success text-success-foreground">Verified</Badge>
                    : <Badge variant="outline">Pending</Badge>}
                  <div className="text-xs text-muted-foreground">
                    Agreement: {r.agreement_accepted_at ? new Date(r.agreement_accepted_at).toLocaleDateString() : "not signed"}
                  </div>
                  <StatusTracker status={r.approval_status} />
                </div>
              </div>
              <Textarea
                className="mt-3 bg-card"
                rows={2}
                placeholder="Notes for the host (optional)"
                value={notes[r.id] ?? r.admin_notes ?? ""}
                onChange={(e) => setNotes((p) => ({ ...p, [r.id]: e.target.value }))}
              />
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <Button
                  size="lg"
                  className="bg-success text-success-foreground hover:bg-success/90"
                  disabled={review.isPending}
                  onClick={() => review.mutate({ id: r.id, decision: "approved" })}
                >
                  <Check /> Approve
                </Button>
                <Button
                  size="lg"
                  variant="destructive"
                  disabled={review.isPending}
                  onClick={() => review.mutate({ id: r.id, decision: "rejected" })}
                >
                  <X /> Reject
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

