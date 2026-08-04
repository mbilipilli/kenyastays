import { useMemo, useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type B = {
  id: string;
  check_in: string;
  check_out: string;
  status: string;
  properties?: { title?: string | null } | null;
  profile?: { full_name?: string | null } | null;
};

function eachNight(from: string, to: string) {
  const out: Date[] = [];
  const d = new Date(from);
  const end = new Date(to);
  while (d < end) {
    out.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return out;
}

export function HostCalendar({ bookings }: { bookings: B[] }) {
  const [month, setMonth] = useState<Date>(new Date());

  const { confirmed, pending, byDay } = useMemo(() => {
    const confirmed: Date[] = [];
    const pending: Date[] = [];
    const byDay: Record<string, B[]> = {};
    for (const b of bookings) {
      if (b.status === "cancelled") continue;
      for (const d of eachNight(b.check_in, b.check_out)) {
        (b.status === "pending" ? pending : confirmed).push(d);
        const k = d.toDateString();
        (byDay[k] ??= []).push(b);
      }
    }
    return { confirmed, pending, byDay };
  }, [bookings]);

  const [selected, setSelected] = useState<Date | undefined>(undefined);
  const dayBookings = selected ? byDay[selected.toDateString()] ?? [] : [];

  return (
    <div className="grid gap-4 rounded-2xl border bg-card p-4 md:grid-cols-[auto_minmax(0,1fr)]">
      <Calendar
        mode="single"
        selected={selected}
        onSelect={setSelected}
        month={month}
        onMonthChange={setMonth}
        modifiers={{ confirmed, pending }}
        modifiersClassNames={{
          confirmed: "bg-primary/20 text-primary font-semibold rounded-md",
          pending: "bg-acacia/20 text-acacia font-semibold rounded-md",
        }}
        className={cn("p-2 pointer-events-auto")}
      />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1"><span className="size-3 rounded bg-primary/30" /> Confirmed</span>
          <span className="inline-flex items-center gap-1"><span className="size-3 rounded bg-acacia/30" /> Pending</span>
        </div>
        <div className="mt-3 text-sm font-medium">
          {selected ? selected.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" }) : "Pick a date"}
        </div>
        {selected && dayBookings.length === 0 && (
          <p className="mt-1 text-sm text-muted-foreground">No bookings — the place is free.</p>
        )}
        <ul className="mt-2 space-y-2">
          {dayBookings.map((b) => (
            <li key={b.id} className="rounded-xl border p-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-medium">{b.properties?.title ?? "Listing"}</span>
                <Badge variant={b.status === "pending" ? "secondary" : "default"}>{b.status}</Badge>
              </div>
              <div className="text-xs text-muted-foreground">
                {b.profile?.full_name ?? "Guest"} · {new Date(b.check_in).toLocaleDateString()} → {new Date(b.check_out).toLocaleDateString()}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
