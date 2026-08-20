import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listTestPushes, listCallbackLogs, retryLastTestPush } from "@/lib/api/mpesa.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { History, RefreshCw, RotateCcw, Webhook } from "lucide-react";
import { toast } from "sonner";

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

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  queued: "secondary",
  sent: "outline",
  confirmed: "default",
  failed: "destructive",
  timeout: "destructive",
};

export function StkPushHistory() {
  const qc = useQueryClient();
  const listFn = useServerFn(listTestPushes);
  const retryFn = useServerFn(retryLastTestPush);

  const q = useQuery({
    queryKey: ["admin", "stk-test-pushes"],
    queryFn: () => listFn({ data: undefined as never }),
    refetchInterval: 15000,
  });

  const retry = useMutation({
    mutationFn: () => retryFn({ data: undefined as never }),
    onSuccess: (r: any) => {
      r?.ok
        ? toast.success("Retry sent — check your phone")
        : toast.error(r?.error ?? "Retry failed");
      qc.invalidateQueries({ queryKey: ["admin", "stk-test-pushes"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Retry failed"),
  });

  const rows = q.data ?? [];
  const last = rows[0];
  const canRetry = Boolean(last) && last?.status !== "confirmed";

  return (
    <Card className="mt-4">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="size-4" /> STK push history
        </CardTitle>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => qc.invalidateQueries({ queryKey: ["admin", "stk-test-pushes"] })}
          >
            <RefreshCw className="size-3.5" /> Refresh
          </Button>
          <Button size="sm" disabled={!canRetry || retry.isPending} onClick={() => retry.mutate()}>
            <RotateCcw className="size-3.5" />
            {retry.isPending ? "Retrying…" : "Retry test push"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No test pushes yet. Send one above and it will appear here.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Receipt</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Confirmed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[r.status] ?? "secondary"}>{r.status}</Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{r.phone}</TableCell>
                    <TableCell>KES {r.amount_kes}</TableCell>
                    <TableCell className="max-w-52 truncate text-xs">
                      <div>{r.account_ref ?? "—"}</div>
                      <div className="text-muted-foreground">{r.checkout_request_id ?? "—"}</div>
                    </TableCell>
                    <TableCell className="text-xs">{r.mpesa_receipt ?? "—"}</TableCell>
                    <TableCell className="whitespace-nowrap text-xs">{fmt(r.created_at)}</TableCell>
                    <TableCell className="whitespace-nowrap text-xs">
                      {fmt(r.confirmed_at)}
                      {r.error || r.result_desc ? (
                        <div className="text-destructive">{r.error ?? r.result_desc}</div>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function CallbackLogPanel() {
  const qc = useQueryClient();
  const listFn = useServerFn(listCallbackLogs);
  const q = useQuery({
    queryKey: ["admin", "mpesa-callback-logs"],
    queryFn: () => listFn({ data: undefined as never }),
    refetchInterval: 15000,
  });
  const rows = q.data ?? [];
  const unmatched = rows.filter((r: any) => r.matched_kind === "unmatched").length;

  return (
    <Card className="mt-4">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <Webhook className="size-4" /> Daraja callbacks
          {unmatched > 0 && (
            <Badge variant="destructive">{unmatched} unmatched</Badge>
          )}
        </CardTitle>
        <Button
          size="sm"
          variant="outline"
          onClick={() => qc.invalidateQueries({ queryKey: ["admin", "mpesa-callback-logs"] })}
        >
          <RefreshCw className="size-3.5" /> Refresh
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Every callback Safaricom posts to your endpoint is recorded here. "Unmatched" means the
          CheckoutRequestID did not match any payment or test push — usually a stale reference or a
          callback URL pointed at the wrong environment.
        </p>
        {rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No callbacks received yet.
          </p>
        ) : (
          <div className="space-y-2">
            {rows.map((r: any) => (
              <details key={r.id} className="rounded-lg border px-3 py-2 text-sm">
                <summary className="flex cursor-pointer flex-wrap items-center gap-2">
                  <Badge
                    variant={
                      r.outcome === "confirmed"
                        ? "default"
                        : r.matched_kind === "unmatched"
                          ? "destructive"
                          : "secondary"
                    }
                  >
                    {r.outcome}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{r.matched_kind}</span>
                  <code className="truncate text-xs">{r.checkout_request_id ?? "no ref"}</code>
                  <span className="ml-auto text-xs text-muted-foreground">{fmt(r.created_at)}</span>
                </summary>
                <div className="mt-2 grid gap-1 text-xs text-muted-foreground">
                  <div>Result: {r.result_code ?? "—"} — {r.result_desc ?? "—"}</div>
                  <div>Receipt: {r.mpesa_receipt ?? "—"}</div>
                  <div>Amount: {r.amount_kes ? `KES ${r.amount_kes}` : "—"} · Phone: {r.phone ?? "—"}</div>
                  {r.note && <div className="text-destructive">{r.note}</div>}
                  <pre className="mt-1 max-h-56 overflow-auto rounded bg-muted p-2">
{JSON.stringify(r.raw, null, 2)}
                  </pre>
                </div>
              </details>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
