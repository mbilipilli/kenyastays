import { useEffect, useState } from "react";
import { ShieldCheck, Home, Smartphone, MapPin, CheckCircle, Clock } from "lucide-react";

const MESSAGES = [
  {
    text: "Verified Kenyan hosts, secure stays, and seamless mobile payments.",
    icon: ShieldCheck,
  },
  {
    text: "Authentic local experiences with instant booking and M-Pesa checkout.",
    icon: Home,
  },
  {
    text: "Stay anywhere in Kenya with trusted hosts and real-time availability.",
    icon: MapPin,
  },
  {
    text: "Compliance-checked listings, transparent commissions, and safe guest relations.",
    icon: CheckCircle,
  },
];

export function RotatingBanner() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % MESSAGES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const message = MESSAGES[index];
  const Icon = message.icon;

  return (
    <section
      className="w-full border-y border-border bg-white"
      aria-label="Kenya Stays trust banner"
      aria-live="polite"
    >
      <div className="mx-auto flex max-w-6xl items-center justify-center gap-3 px-4 py-4 text-center md:py-5">
        <span className="flex shrink-0 items-center justify-center rounded-full bg-admin/10 p-2 text-admin">
          <Icon className="size-5 md:size-6" aria-hidden="true" />
        </span>
        <p className="text-sm font-semibold text-foreground transition-opacity duration-500 ease-in-out md:text-base">
          {message.text}
        </p>
      </div>
      <div className="flex justify-center gap-2 pb-3 md:pb-4">
        {MESSAGES.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={`Show banner message ${i + 1}`}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === index ? "w-6 bg-admin" : "w-1.5 bg-admin/30 hover:bg-admin/50"
            }`}
          />
        ))}
      </div>
    </section>
  );
}
