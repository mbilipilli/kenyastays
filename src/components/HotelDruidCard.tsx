import { Link } from "@tanstack/react-router";
import { MapPin } from "lucide-react";
import { formatKES } from "@/lib/constants";

export type HotelDruidCardProps = {
  external_id: string;
  hotel_name: string;
  room_type: string;
  city: string;
  price_kes: number;
  booking_status: "available" | "sold_out";
  thumbnail: string;
};

export function HotelDruidCard(p: HotelDruidCardProps) {
  const available = p.booking_status === "available";
  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:shadow-md">
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <img
          src={p.thumbnail}
          alt={p.hotel_name}
          className="size-full object-cover transition duration-500 group-hover:scale-105"
          loading="lazy"
        />
        <span
          className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-xs font-medium ${
            available ? "bg-acacia/90 text-white" : "bg-amber-500/90 text-white"
          }`}
        >
          {available ? "Available" : "Sold out"}
        </span>
        <span className="absolute right-2 top-2 rounded-full bg-background/90 px-2 py-0.5 text-[10px] font-semibold text-accent backdrop-blur">
          Verified
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <h3 className="font-serif text-base leading-tight">{p.hotel_name}</h3>
        <p className="text-xs text-muted-foreground">{p.room_type}</p>
        <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="size-3" /> {p.city}
        </p>
        <div className="mt-2 flex items-center justify-between">
          <div className="font-semibold text-foreground">
            {formatKES(p.price_kes)} <span className="text-xs font-normal text-muted-foreground">/ night</span>
          </div>
          <Link
            to="/search"
            search={{ q: p.hotel_name, city: p.city }}
            className={`inline-flex h-8 items-center rounded-full px-3 text-xs font-semibold ${
              available
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "pointer-events-none bg-muted text-muted-foreground"
            }`}
            aria-disabled={!available}
          >
            Book Now
          </Link>
        </div>
      </div>
    </div>
  );
}
