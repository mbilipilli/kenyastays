import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { initiateMpesaPayment } from "@/lib/api/mpesa.functions";
import { initiateIpayPayment } from "@/lib/api/ipay.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Smartphone, CreditCard, Wallet } from "lucide-react";
import { toast } from "sonner";
import { formatKES } from "@/lib/constants";

/** Posts a signed iPay payload to their hosted checkout page. */
function redirectToIpay(action: string, fields: Record<string, string>) {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = action;
  for (const [name, value] of Object.entries(fields)) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }
  document.body.appendChild(form);
  form.submit();
}

export function PayBookingDialog({ bookingId, amountKes, defaultPhone }: { bookingId: string; amountKes: number; defaultPhone?: string | null }) {
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<"mpesa" | "card" | "paypal">("mpesa");
  const [phone, setPhone] = useState(defaultPhone ?? "");
  const qc = useQueryClient();
  const fn = useServerFn(initiateMpesaPayment);
  const ipayFn = useServerFn(initiateIpayPayment);
  const m = useMutation({
    mutationFn: () => fn({ data: { booking_id: bookingId, phone } }),
    onSuccess: () => {
      toast.success("STK Push sent — check your phone");
      qc.invalidateQueries();
      setOpen(false);
    },
    onError: (e: any) => toast.error(e?.message ?? "Payment failed"),
  });
  const ipay = useMutation({
    mutationFn: (channel: "card" | "paypal") =>
      ipayFn({ data: { booking_id: bookingId, channel, phone } }),
    onSuccess: (res: any) => {
      toast.success("Redirecting to secure checkout…");
      redirectToIpay(res.action, res.fields);
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not start checkout"),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">Pay {formatKES(amountKes)}</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Complete your payment</DialogTitle>
          <DialogDescription>{formatKES(amountKes)} due for this booking</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: "mpesa" as const, label: "M-Pesa", icon: <Smartphone className="size-4" /> },
            { id: "card" as const, label: "Card", icon: <CreditCard className="size-4" /> },
            { id: "paypal" as const, label: "PayPal", icon: <Wallet className="size-4" /> },
          ].map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => setMethod(o.id)}
              className={`flex flex-col items-center gap-1 rounded-xl border p-3 text-xs transition ${
                method === o.id ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted"
              }`}
            >
              {o.icon}
              {o.label}
            </button>
          ))}
        </div>

        {method === "mpesa" && (
          <div className="space-y-3">
            <label className="text-sm font-medium">Safaricom phone number</label>
            <Input placeholder="07XX XXX XXX" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <Button className="w-full" disabled={!phone || m.isPending} onClick={() => m.mutate()}>
              {m.isPending ? "Sending STK Push…" : `Pay ${formatKES(amountKes)} with M-Pesa`}
            </Button>
            <p className="text-xs text-muted-foreground">You'll receive a prompt on your phone. Enter your M-Pesa PIN to complete.</p>
          </div>
        )}
        {method !== "mpesa" && (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            {method === "card" ? "Card payments" : "PayPal"} coming soon — please use M-Pesa.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
