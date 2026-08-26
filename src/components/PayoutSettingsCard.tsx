import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { formatKES } from "@/lib/constants";
import { Smartphone } from "lucide-react";
import { getPayoutSettings, setPayoutPhone, listMyPayouts } from "@/lib/api/payouts.functions";

export function PayoutSettingsCard() {
  const qc = useQueryClient();
  const getFn = useServerFn(getPayoutSettings);
  const listFn = useServerFn(listMyPayouts);
  const saveFn = useServerFn(setPayoutPhone);

  const { data: settings } = useQuery({ queryKey: ["payout-settings"], queryFn: () => getFn({}) });
  const { data: payouts = [] } = useQuery({ queryKey: ["my-payouts"], queryFn: () => listFn({}) });
  const [phone, setPhone] = useState("");

  const saveM = useMutation({
    mutationFn: (p: string) => saveFn({ data: { phone: p } }),
    onSuccess: () => {
      toast.success("Payout number saved");
      setPhone("");
      qc.invalidateQueries({ queryKey: ["payout-settings"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not save"),
  });

  const current = settings?.payout_phone;

  return (
    <section className="mt-8 rounded-2xl border bg-card p-4">
      <div className="flex items-center gap-2">
        <Smartphone className="size-4 text-primary" />
        <h2 className="font-serif text-xl">Payouts</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Your earnings are sent straight to your M-Pesa the moment a guest pays. Kenya Stays only keeps
        the platform commission and guest service fee.
      </p>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Label htmlFor="payout-phone" className="text-xs">M-Pesa payout number</Label>
          <Input
            id="payout-phone"
            inputMode="tel"
            placeholder={current ?? "07XX XXX XXX"}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <Button disabled={phone.trim().length < 9 || saveM.isPending} onClick={() => saveM.mutate(phone.trim())}>
          {saveM.isPending ? "Saving…" : current ? "Update" : "Save"}
        </Button>
      </div>
      {current ? (
        <p className="mt-2 text-xs text-muted-foreground">Currently paying out to <span className="font-medium text-foreground">{current}</span></p>
      ) : (
        <p className="mt-2 text-xs text-destructive">Add a number — payouts are held until you do.</p>
      )}

      {payouts.length > 0 && (
        <ul className="mt-4 divide-y rounded-xl border">
          {payouts.map((p: any) => (
            <li key={p.id} className="flex items-center justify-between gap-2 p-3 text-sm">
              <div>
                <div className="font-medium">{formatKES(p.amount_kes)}</div>
                <div className="text-xs text-muted-foreground">
                  {new Date(p.created_at).toLocaleDateString()} · {p.mpesa_receipt ?? p.result_desc ?? "—"}
                </div>
              </div>
              <Badge variant={p.status === "paid" ? "default" : p.status === "failed" ? "destructive" : "secondary"}>
                {p.status}
              </Badge>
            </li>
          ))}
        </ul>
      )}

      <Button asChild variant="outline" size="sm" className="mt-4">
        <Link to="/payouts">View payout status &amp; errors</Link>
      </Button>
    </section>
  );
}
