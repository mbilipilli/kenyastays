import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ShieldCheck, MapPin, Smartphone, Heart, Users, CheckCircle } from "lucide-react";

const VALUES = [
  { icon: ShieldCheck, label: "Trust & Safety" },
  { icon: MapPin, label: "Kenyan Spirit" },
  { icon: Heart, label: "Local Excellence" },
];

const HIGHLIGHTS = [
  "Verified local hosts with compliance checks (ID, KRA PIN, proof of ownership).",
  "Secure mobile payments including M-Pesa STK push.",
  "Real-time availability and instant booking confirmation.",
  "Authentic local experiences across Kenya.",
  "24/7 local support for guests and hosts.",
  "Fairness, privacy, and transparency for everyone.",
];

export function AboutUsModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] max-w-2xl overflow-y-auto bg-white p-0">
        <div className="bg-primary/5 px-6 py-8 sm:px-8">
          <DialogHeader className="space-y-2 text-left">
            <DialogTitle className="font-serif text-2xl text-foreground sm:text-3xl">
              About Kenya Stays
            </DialogTitle>
            <DialogDescription className="text-base text-muted-foreground">
              Your trusted gateway to authentic Kenyan stays.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-6 px-6 pb-8 sm:px-8">
          <p className="text-foreground/90 leading-relaxed">
            Kenya Stays is a property rental and hosting platform built for Kenya. We connect guests with verified local hosts, offering secure stays and seamless mobile payments.
          </p>

          <div>
            <h3 className="mb-3 flex items-center gap-2 font-serif text-lg">
              <Users className="size-5 text-primary" /> Our Values
            </h3>
            <div className="grid gap-3 sm:grid-cols-3">
              {VALUES.map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-3"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="size-4" />
                  </span>
                  <span className="text-sm font-medium">{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-3 font-serif text-lg">What We Stand For</h3>
            <ul className="space-y-2">
              {HIGHLIGHTS.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-foreground/90">
                  <CheckCircle className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl bg-primary/5 p-4 text-center">
            <p className="font-serif text-lg text-foreground">
              Discover Kenya with confidence. Stay local, stay Kenyan.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function useAboutUsModal() {
  const [open, setOpen] = useState(false);
  return { open, setOpen, AboutUsModal: () => <AboutUsModal open={open} onOpenChange={setOpen} /> };
}
