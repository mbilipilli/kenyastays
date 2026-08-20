import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { mpesaConfigStatus, testStkPush } from "@/lib/api/mpesa.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Check, KeyRound, Smartphone, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  head: () => ({ meta: [{ title: "Payment settings — Kenya Stays Admin" }] }),
  component: PaymentSettingsPage,
});

function PaymentSettingsPage() {
  const statusFn = useServerFn(mpesaConfigStatus);
  const status = useQuery({
    queryKey: ["admin", "mpesa-config"],
    queryFn: () => statusFn({ data: undefined as any }),
  });

  if (status.isError) return <div className="p-8 text-destructive">You need admin access.</div>;
  const d = status.data;

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link to="/admin"><ArrowLeft /> Back to admin</Link>
      </Button>
      <h1 className="font-serif text-3xl font-semibold tracking-tight">Payment settings</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        M-Pesa Daraja credentials are stored in the encrypted secret store — never in the database and
        never shown back in the browser. This page confirms what is configured and lets you fire a
        sandbox STK push.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <KeyRound className="size-4" /> STK Push (collect payments)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {d
              ? Object.entries(d.stk).map(([k, v]) => <StatusRow key={k} name={k} ok={v as boolean} />)
              : <Skeleton />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <KeyRound className="size-4" /> B2C (host payouts)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {d
              ? Object.entries(d.payouts).map(([k, v]) => <StatusRow key={k} name={k} ok={v as boolean} />)
              : <Skeleton />}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader><CardTitle className="text-base">Environment</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            Mode: <Badge variant={d?.env === "production" ? "default" : "secondary"}>{d?.env ?? "…"}</Badge>
          </div>
          <div className="break-all text-muted-foreground">
            Callback URL (paste into your Daraja app): <code>{d?.callbackUrl ?? "…"}</code>
          </div>
        </CardContent>
      </Card>

      <StkTester />

      <Card className="mt-4 border-dashed">
        <CardContent className="pt-6 text-sm text-muted-foreground">
          To add or rotate credentials, ask me in chat ("update my Daraja keys") and I'll open the
          secure form where you paste them directly into the encrypted store. Values never pass
          through the chat, the database, or this page.
        </CardContent>
      </Card>
    </main>
  );
}

function Skeleton() {
  return <div className="h-20 animate-pulse rounded-lg bg-muted" />;
}

function StatusRow({ name, ok }: { name: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
      <code className="text-xs">{name}</code>
      {ok ? (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-primary"><Check className="size-3.5" /> Set</span>
      ) : (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-destructive"><X className="size-3.5" /> Missing</span>
      )}
    </div>
  );
}

function StkTester() {
  const fn = useServerFn(testStkPush);
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("1");
  const [result, setResult] = useState<any>(null);
  const m = useMutation({
    mutationFn: () => fn({ data: { phone, amount: Math.max(1, Number(amount) || 1) } }),
    onSuccess: (r: any) => {
      setResult(r);
      r.ok ? toast.success("STK push sent — check your phone") : toast.error(r.error ?? "Failed");
    },
    onError: (e: any) => {
      setResult({ ok: false, error: e?.message ?? "Request failed" });
      toast.error(e?.message ?? "Request failed");
    },
  });

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Smartphone className="size-4" /> Test STK push (sandbox)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Input
            className="min-w-40 flex-1"
            placeholder="07XX XXX XXX"
            value={phone}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPhone(e.target.value)}
          />
          <Input
            className="w-28"
            type="number"
            min={1}
            max={1000}
            value={amount}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAmount(e.target.value)}
          />
          <Button disabled={!phone || m.isPending} onClick={() => m.mutate()}>
            {m.isPending ? "Sending…" : "Send test"}
          </Button>
        </div>
        {result && (
          <pre
            className={`overflow-x-auto rounded-lg border p-3 text-xs ${
              result.ok
                ? "border-primary/40 bg-primary/5"
                : "border-destructive/40 bg-destructive/5 text-destructive"
            }`}
          >
{JSON.stringify(result, null, 2)}
          </pre>
        )}
      </CardContent>
    </Card>
  );
}
