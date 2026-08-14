import { useState } from "react";
import {
  Home,
  Camera,
  Banknote,
  CalendarCheck,
  Handshake,
  IdCard,
  Shield,
  HousePlus,
  TriangleAlert,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";

const ITEMS = [
  { icon: Home, label: "Ownership & Compliance", description: "You are the owner and comply with Kenyan laws." },
  { icon: Camera, label: "Accurate Listings", description: "Provide truthful details & photos." },
  { icon: Banknote, label: "Pricing & Payments", description: "Accept platform commission & receive payouts via M-Pesa." },
  { icon: CalendarCheck, label: "Booking Policies", description: "Honor bookings and follow cancellation rules." },
  { icon: Handshake, label: "Guest Relations", description: "Treat guests fairly & protect their privacy." },
  { icon: IdCard, label: "Verification Docs", description: "Upload ID, ownership proof & KRA PIN." },
  { icon: Shield, label: "Platform Rules", description: "No direct bookings or policy violations." },
  { icon: HousePlus, label: "Host Liability", description: "Responsible for safety & insurance." },
  { icon: TriangleAlert, label: "Termination Terms", description: "Honor pending bookings if ending agreement." },
];

export function HostAgreementModal({
  open,
  onAccept,
  onDismiss,
  pending,
}: {
  open: boolean;
  onAccept: () => void;
  onDismiss: () => void;
  pending?: boolean;
}) {
  const [agreed, setAgreed] = useState(false);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onDismiss()}>
      <DialogContent className="max-h-[90dvh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">Host Agreement Checklist</DialogTitle>
          <DialogDescription>Please review and confirm before listing your property.</DialogDescription>
        </DialogHeader>

        <ul className="mt-2 grid gap-2 sm:grid-cols-2">
          {ITEMS.map(({ icon: Icon, label, description }) => (
            <li key={label} className="flex gap-3 rounded-xl border bg-card p-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-muted-foreground">{description}</p>
              </div>
            </li>
          ))}
        </ul>

        <label className="mt-4 flex items-center gap-3 rounded-xl border bg-muted/40 p-3 text-sm">
          <Checkbox checked={agreed} onCheckedChange={(v) => setAgreed(!!v)} />
          I Agree to the Terms &amp; Conditions
        </label>

        <Button size="lg" className="w-full" disabled={!agreed || pending} onClick={onAccept}>
          {pending ? "Saving…" : "Accept & Continue"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
