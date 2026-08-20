import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import {
  adminInsights,
  adminOverview,
  adminRangeStats,
  hostPayoutsOverview,
  hostEnquiries,
} from "@/lib/api/admin.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import {
  AlertTriangle,
  BadgeCheck,
  CalendarPlus,
  CheckCircle2,
  FileWarning,
  MapPin,
  MessageSquare,
  Shield,
  Star,
  TrendingUp,
  Wallet,
  XCircle,
} from "lucide-react";

const kes = (n: number) => `KES ${new Intl.NumberFormat("en-KE").format(Math.round(n || 0))}`;
const when = (s?: string | null) =>
  s ? new Date(s).toLocaleString("en-KE", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

const iso = (d: Date) => d.toISOString().slice(0, 10);
const daysAgo = (n: number) => iso(new Date(Date.now() - n * 86_400_000));

const PRESETS = [
  { id: "7d", label: "Last 7 days", days: 7 },
  { id: "30d", label: "Last 30 days", days: 30 },
  { id: "90d", label: "Last 90 days", days: 90 },
  { id: "12m", label: "Last 12 months", days: 365 },
] as const;


export function CommandCenter() {
  const insightsFn = useServerFn(adminInsights);
  const overviewFn = useServerFn(adminOverview);
  const payoutsFn = useServerFn(hostPayoutsOverview);
  const enquiriesFn = useServerFn(hostEnquiries);

  const insights = useQuery({ queryKey: ["admin", "insights"], queryFn: () => insightsFn({ data: undefined as any }) });
  const overview = useQuery({ queryKey: ["admin", "overview"], queryFn: () => overviewFn({ data: undefined as any }) });
  const payouts = useQuery({ queryKey: ["admin", "payouts"], queryFn: () => payoutsFn({ data: undefined as any }) });
  const enquiries = useQuery({ queryKey: ["admin", "enquiries"], queryFn: () => enquiriesFn({ data: undefined as any }) });

  const d: any = insights.data;
  const o: any = overview.data;
  const p: any = payouts.data;

  const revenueTrend: { label: string; kes: number }[] = d?.revenueTrend ?? [];
  const revenueThisMonth = revenueTrend.length ? revenueTrend[revenueTrend.length - 1].kes : 0;
  const prevMonth = revenueTrend.length > 1 ? revenueTrend[revenueTrend.length - 2].kes : 0;
  const delta = prevMonth ? Math.round(((revenueThisMonth - prevMonth) / prevMonth) * 100) : null;

  const complianceAlerts = (d?.compliance?.length ?? 0) + (d?.escalations?.length ?? 0);

  // Region heat from bookings by city
  const byRegion: Record<string, number> = { Coast: 0, Nairobi: 0, Highlands: 0 };
  (d?.bookingsByCity ?? []).forEach((c: any) => (byRegion[regionOf(c.city)] += c.count));
  const maxRegion = Math.max(1, ...Object.values(byRegion));

  // Messaging hub — conversations derived from live activity
  const conversations = [
    ...(o?.recentBookings ?? []).slice(0, 4).map((b: any) => ({
      id: `b-${b.id}`,
      party: "Guest" as const,
      name: b.properties?.title ?? "Booking enquiry",
      snippet: `${b.status === "pending" ? "Awaiting payment confirmation" : "Booking " + b.status} • ${b.check_in} → ${b.check_out}`,
      at: b.created_at,
      unread: b.status === "pending",
    })),
    ...((enquiries.data as any[]) ?? []).slice(0, 4).map((h: any) => ({
      id: `h-${h.id}`,
      party: "Host" as const,
      name: h.name,
      snippet: `${h.stage}${h.drafts ? ` • ${h.drafts} draft listing(s)` : ""}`,
      at: h.joined_at,
      unread: !h.verified,
    })),
    ...(d?.escalations ?? []).slice(0, 3).map((e: any) => ({
      id: `a-${e.id}`,
      party: "Admin" as const,
      name: e.name,
      snippet: e.reason,
      at: null,
      unread: e.severity === "high",
    })),
  ];

  // Security log — recent platform actions
  const securityLog = [
    ...(p?.payouts ?? []).slice(0, 5).map((r: any) => ({
      id: `p-${r.id}`,
      kind: r.status === "success" || r.status === "completed" ? "Payout sent" : `Payout ${r.status}`,
      detail: `${r.host_name} • ${kes(r.amount_kes)}`,
      at: r.created_at,
      tone: r.status === "failed" ? "bad" : r.status === "success" || r.status === "completed" ? "good" : "warn",
    })),
    ...(d?.compliance ?? []).slice(0, 5).map((c: any, i: number) => ({
      id: `c-${i}`,
      kind: c.severity === "high" ? "Listing flagged" : "Review overdue",
      detail: `${c.property} • ${c.issue}`,
      at: null,
      tone: c.severity === "high" ? "bad" : "warn",
    })),
  ];

  const loading = insights.isLoading || overview.isLoading;

  return (
    <div className="space-y-6">
      {/* Top analytics cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          icon={<TrendingUp className="size-5" />}
          label="Revenue this month"
          value={loading ? "—" : kes(revenueThisMonth)}
          sub={delta == null ? "No prior month" : `${delta >= 0 ? "+" : ""}${delta}% vs last month`}
          tone="green"
        />
        <Metric
          icon={<Wallet className="size-5" />}
          label="Pending payouts"
          value={payouts.isLoading ? "—" : kes(p?.totals?.pending_kes ?? 0)}
          sub={`${(p?.payouts ?? []).filter((r: any) => ["pending", "queued", "processing"].includes(String(r.status))).length} in queue`}
          tone="gold"
        />
        <Metric
          icon={<CalendarPlus className="size-5" />}
          label="New bookings"
          value={loading ? "—" : (o?.bookingsToday ?? 0)}
          sub={`${d?.bookingTotals?.pending ?? 0} pending confirmation`}
          tone="green"
        />
        <Metric
          icon={<AlertTriangle className="size-5" />}
          label="Compliance alerts"
          value={loading ? "—" : complianceAlerts}
          sub={`${d?.documentQueue?.length ?? 0} awaiting documents`}
          tone={complianceAlerts ? "alert" : "neutral"}
        />
      </div>

      {/* Three-panel workspace */}
      <div className="grid gap-4 lg:grid-cols-12">
        {/* Left */}
        <div className="space-y-4 lg:col-span-4">
          <Card className="border-kenya-green/20">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="size-4 text-kenya-green" /> Booking heatmap
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <KenyaHeatmap byRegion={byRegion} max={maxRegion} />
              <div className="space-y-2">
                {(["Coast", "Nairobi", "Highlands"] as const).map((r) => (
                  <div key={r} className="flex items-center gap-3">
                    <span className="w-20 shrink-0 text-xs font-medium">{r}</span>
                    <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-kenya-green"
                        style={{ width: `${Math.round((byRegion[r] / maxRegion) * 100)}%` }}
                      />
                    </div>
                    <span className="w-8 shrink-0 text-right text-xs tabular-nums text-muted-foreground">{byRegion[r]}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Star className="size-4 text-kenya-gold" /> Top hosts &amp; properties
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {(d?.hostManagement ?? []).slice(0, 4).map((h: any) => (
                  <div key={h.id} className="flex items-center justify-between gap-3 rounded-lg bg-kenya-green-soft/60 px-3 py-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{h.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {h.listings} listing(s) • {h.rating ? `${h.rating}★` : "No ratings"}
                      </div>
                    </div>
                    <div className="shrink-0 text-sm font-semibold">{kes(h.earnings_kes)}</div>
                  </div>
                ))}
                {!loading && !(d?.hostManagement ?? []).length && <Empty>No host activity yet</Empty>}
              </div>
              <div className="space-y-2 border-t pt-3">
                {(d?.bookingsByProperty ?? []).slice(0, 4).map((pr: any) => (
                  <div key={pr.property} className="flex items-center justify-between gap-3 text-sm">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{pr.property}</div>
                      <div className="text-xs text-muted-foreground">{pr.city} • {pr.bookings} bookings</div>
                    </div>
                    <span className="shrink-0 text-xs font-semibold text-kenya-green">{kes(pr.revenue_kes)}</span>
                  </div>
                ))}
                {!loading && !(d?.bookingsByProperty ?? []).length && <Empty>No property bookings yet</Empty>}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Center */}
        <div className="lg:col-span-5">
          <Card className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Shield className="size-4 text-kenya-green" /> Compliance tracker
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(d?.documentQueue ?? []).slice(0, 8).map((h: any) => {
                const items = [
                  { label: "KRA PIN", ok: h.kra_status === "Submitted" },
                  { label: "National ID", ok: h.id_status === "Verified" },
                  { label: "Property proof", ok: h.ownership_status === "Verified" },
                ];
                const missing = items.filter((i) => !i.ok).length;
                return (
                  <div key={h.id} className="rounded-xl border p-3">
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                      <div className="truncate text-sm font-medium">{h.name}</div>
                      <Badge
                        variant="outline"
                        className={missing ? "border-destructive/30 text-destructive" : "border-kenya-green/40 text-kenya-green"}
                      >
                        {missing ? `${missing} missing` : "Complete"}
                      </Badge>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {items.map((i) => (
                        <span
                          key={i.label}
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs ${
                            i.ok ? "bg-kenya-green-soft text-kenya-green" : "bg-kenya-gold-soft text-foreground/70"
                          }`}
                        >
                          {i.ok ? <CheckCircle2 className="size-3" /> : <FileWarning className="size-3" />}
                          {i.label}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
              {!loading && !(d?.documentQueue ?? []).length && <Empty>All hosts are fully verified</Empty>}
            </CardContent>
          </Card>
        </div>

        {/* Right */}
        <div className="lg:col-span-3">
          <Card className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageSquare className="size-4 text-kenya-gold" /> Messaging hub
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {conversations.map((c) => (
                <div key={c.id} className="rounded-lg border p-3">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                    <span className="truncate text-sm font-medium">{c.name}</span>
                    <Badge
                      variant="secondary"
                      className={
                        c.party === "Guest"
                          ? "bg-kenya-green-soft text-kenya-green"
                          : c.party === "Host"
                            ? "bg-kenya-gold-soft text-foreground/70"
                            : "bg-admin-muted text-admin"
                      }
                    >
                      {c.party}
                    </Badge>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{c.snippet}</p>
                  <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>{when(c.at)}</span>
                    {c.unread && <span className="font-medium text-kenya-green">Needs reply</span>}
                  </div>
                </div>
              ))}
              {!loading && !conversations.length && <Empty>No conversations yet</Empty>}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Revenue trends</CardTitle>
          </CardHeader>
          <CardContent style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueTrend}>
                <defs>
                  <linearGradient id="kenyaRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--kenya-green)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--kenya-green)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                <XAxis dataKey="label" stroke="currentColor" fontSize={12} />
                <YAxis stroke="currentColor" fontSize={12} width={70} tickFormatter={(v: any) => `${Math.round(Number(v) / 1000)}k`} />
                <Tooltip formatter={(v: any) => kes(Number(v))} />
                <Area type="monotone" dataKey="kes" stroke="var(--kenya-green)" strokeWidth={2} fill="url(#kenyaRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <BadgeCheck className="size-4 text-kenya-green" /> Security log
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {securityLog.slice(0, 8).map((l) => (
              <div key={l.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border px-3 py-2">
                <span
                  className={`grid size-7 shrink-0 place-items-center rounded-full ${
                    l.tone === "good"
                      ? "bg-kenya-green-soft text-kenya-green"
                      : l.tone === "bad"
                        ? "bg-destructive/10 text-destructive"
                        : "bg-kenya-gold-soft text-foreground/70"
                  }`}
                >
                  {l.tone === "good" ? <CheckCircle2 className="size-4" /> : l.tone === "bad" ? <XCircle className="size-4" /> : <AlertTriangle className="size-4" />}
                </span>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{l.kind}</div>
                  <div className="truncate text-xs text-muted-foreground">{l.detail}</div>
                </div>
                <span className="shrink-0 text-[11px] text-muted-foreground">{when(l.at)}</span>
              </div>
            ))}
            {!loading && !securityLog.length && <Empty>No recent activity</Empty>}
            <div className="pt-1 text-right">
              <Link to="/admin" className="text-xs font-medium text-kenya-green hover:underline">
                View full audit trail
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-6 text-center text-sm text-muted-foreground">{children}</p>;
}

function Metric({
  icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  sub: string;
  tone: "green" | "gold" | "alert" | "neutral";
}) {
  const tint =
    tone === "green"
      ? "bg-kenya-green-soft text-kenya-green"
      : tone === "gold"
        ? "bg-kenya-gold-soft text-foreground/70"
        : tone === "alert"
          ? "bg-destructive/10 text-destructive"
          : "bg-muted text-muted-foreground";
  return (
    <Card className="overflow-hidden">
      <CardContent className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4 p-5">
        <div className={`grid size-11 shrink-0 place-items-center rounded-xl ${tint}`}>{icon}</div>
        <div className="min-w-0">
          <div className="truncate text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
          <div className="truncate text-2xl font-semibold">{value}</div>
          <div className="truncate text-xs text-muted-foreground">{sub}</div>
        </div>
      </CardContent>
    </Card>
  );
}

/** Stylised Kenya outline with three shaded booking regions. */
function KenyaHeatmap({ byRegion, max }: { byRegion: Record<string, number>; max: number }) {
  const op = (r: string) => 0.18 + (byRegion[r] / max) * 0.72;
  return (
    <svg viewBox="0 0 200 200" className="mx-auto h-44 w-full" role="img" aria-label="Bookings by Kenyan region">
      <path
        d="M40 30 L110 22 L128 44 L168 62 L150 108 L132 176 L92 176 L58 132 L34 96 Z"
        className="fill-muted stroke-border"
        strokeWidth="1.5"
      />
      {/* Highlands (west/central) */}
      <path d="M40 30 L110 22 L112 96 L58 132 L34 96 Z" fill="var(--kenya-green)" opacity={op("Highlands")} />
      {/* Nairobi (south-central) */}
      <path d="M112 96 L58 132 L92 176 L124 150 Z" fill="var(--kenya-gold)" opacity={op("Nairobi")} />
      {/* Coast (south-east) */}
      <path d="M112 96 L150 108 L132 176 L92 176 L124 150 Z" fill="var(--kenya-green)" opacity={op("Coast")} />
      <text x="70" y="72" className="fill-foreground text-[9px]">Highlands</text>
      <text x="80" y="140" className="fill-foreground text-[9px]">Nairobi</text>
      <text x="120" y="168" className="fill-foreground text-[9px]">Coast</text>
    </svg>
  );
}
