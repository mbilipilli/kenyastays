import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listStkLedger } from "@/lib/api/mpesa.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { RefreshCw, Receipt, ChevronDown } from "lucide-react";

const FILTERS = ["all", "payment", "test", "orphan_callback"] as const;
type Filter = (typeof FILTERS)[number];

const FILTER_LABEL: Record<Filter, string> = {
  all: "All",
  payment: "Booking payments",
  test: "Test pushes",
  orphan_callback: "Unmatched callbacks",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  success: "default",
  confirmed: "default",
  pending: "secondary",
  queued: "secondary",
  sent: "outline",
  failed: "destructive",
  timeout: "destructive",
  unmatched: "destructive",
};

function fmt(ts: string | null | undefined) {
  if (!ts) return "—";
  return new Date(ts).toLocaleString("en-KE", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function StkLedger() {
  const qc = useQueryClient();
  const ledgerFn = useServerFn(listStkLedger);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ["admin", "stk-ledger"],
    queryFn: () => ledgerFn({ data: undefined as never }),
    refetchInterval: 15000,
  });

  const rows = useMemo(() => {
    const all = (q.data ?? []) as any[];
    const term = search.trim().toLowerCase();
    return all.filter((r) => {
      if (filter !== "all" && r.kind !== filter) return false;
      if (!term) return true;
      return [r.phone, r.checkout_request_id, r.merchant_request_id, r.mpesa_receipt, r.reference]
        .filter(Boolean)
        .some((v: string) => String(v).toLowerCase().includes(term));
    });
  }, [q.data, filter, search]);

  const counts = useMemo(() => {
    const all = (q.data ?? []) as any[];
    return {
      total: all.length,
      confirmed: all.filter((r) => r.status === "success" || r.status === "confirmed").length,
      failed: all.filter((r) => ["failed", "timeout", "unmatched"].includes(r.status)).length,
      awaiting: all.filter((r) => ["pending", "queued", "sent"].includes(r.status)).length,
    };
  }, [q.data]);

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <Receipt className="size-4" /> STK push ledger
        </CardTitle>
        <Button
          size="sm"
          variant="outline"
          onClick={() => qc.invalidateQueries({ queryKey: ["admin", "stk-ledger"] })}
        >
          <RefreshCw className="size-3.5" /> Refresh
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="Requests" value={counts.total} />
          <Stat label="Confirmed" value={counts.confirmed} />
          <Stat label="Awaiting callback" value={counts.awaiting} />
          <Stat label="Failed / unmatched" value={counts.failed} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {FILTERS.map((f) => (
            <Button
              key={f}
              size="sm"
              variant={filter === f ? "default" : "outline"}
              onClick={() => setFilter(f)}
            >
              {FILTER_LABEL[f]}
            </Button>
          ))}
          <Input
            className="ml-auto w-full sm:w-64"
            placeholder="Search phone, receipt or reference"
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
          />
        </div>

        {q.isLoading ? (
          <div className="h-40 animate-pulse rounded-lg bg-muted" />
        ) : rows.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No STK push activity matches this view yet.
          </p>
        ) : (
          <div className="space-y-2">
            {rows.map((r) => {
              const isOpen = open === r.id;
              return (
                <div key={r.id} className="rounded-lg border">
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : r.id)}
                    className="flex w-full flex-wrap items-center gap-2 px-3 py-2 text-left text-sm"
                  >
                    <Badge variant={STATUS_VARIANT[r.status] ?? "secondary"}>{r.status}</Badge>
                    <Badge variant="outline" className="text-xs">
                      {r.kind === "orphan_callback" ? "callback only" : r.kind}
                    </Badge>
                    <span className="font-medium">{r.phone ?? "—"}</span>
                    <span className="text-muted-foreground">
                      {r.amount_kes ? `KES ${r.amount_kes}` : "—"}
                    </span>
                    <code className="max-w-48 truncate text-xs text-muted-foreground">
                      {r.checkout_request_id ?? "no ref"}
                    </code>
                    <span className="ml-auto whitespace-nowrap text-xs text-muted-foreground">
                      {fmt(r.requested_at)}
                    </span>
                    <ChevronDown
                      className={`size-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
                    />
                  </button>

                  {isOpen && (
                    <div className="space-y-3 border-t px-3 py-3 text-xs">
                      <div className="grid gap-1 sm:grid-cols-2">
                        <Detail label="Reference" value={r.reference ?? "—"} />
                        <Detail label="Merchant request" value={r.merchant_request_id ?? "—"} />
                        <Detail label="M-Pesa receipt" value={r.mpesa_receipt ?? "—"} />
                        <Detail
                          label="Response code"
                          value={r.result_code === null ? "—" : String(r.result_code)}
                        />
                        <Detail label="Response description" value={r.result_desc ?? "—"} />
                        <Detail label="Requested at" value={fmt(r.requested_at)} />
                        <Detail label="Confirmed at" value={fmt(r.confirmed_at)} />
                      </div>

                      <div>
                        <div className="mb-1 font-medium">
                          Callback events ({r.callbacks.length})
                        </div>
                        {r.callbacks.length === 0 ? (
                          <p className="text-muted-foreground">
                            No callback received yet for this request.
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {r.callbacks.map((c: any) => (
                              <details key={c.id} className="rounded border bg-muted/40 px-2 py-1.5">
                                <summary className="flex cursor-pointer flex-wrap items-center gap-2">
                                  <Badge
                                    variant={
                                      c.outcome === "confirmed"
                                        ? "default"
                                        : c.matched_kind === "unmatched"
                                          ? "destructive"
                                          : "secondary"
                                    }
                                  >
                                    {c.outcome}
                                  </Badge>
                                  <span>code {c.result_code ?? "—"}</span>
                                  <span className="truncate text-muted-foreground">
                                    {c.result_desc ?? "—"}
                                  </span>
                                  <span className="ml-auto text-muted-foreground">
                                    {fmt(c.created_at)}
                                  </span>
                                </summary>
                                {c.note && <div className="mt-1 text-destructive">{c.note}</div>}
                                <pre className="mt-1 max-h-56 overflow-auto rounded bg-background p-2">
{JSON.stringify(c.raw, null, 2)}
                                </pre>
                              </details>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border px-3 py-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="text-muted-foreground">{label}:</span>
      <span className="break-all font-medium">{value}</span>
    </div>
  );
}
