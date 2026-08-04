import { Link } from "@tanstack/react-router";
import { Star, Leaf, Users } from "lucide-react";
import { formatKES } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";

type Props = {
  id: string;
  title: string;
  city: string;
  cover_url: string | null;
  price_kes: number;
  rating: number | null;
  reviews_count: number;
  is_eco?: boolean;
  is_community?: boolean;
  max_guests?: number;
};

export function PropertyCard(p: Props) {
  return (
    <Link
      to="/property/$id"
      params={{ id: p.id }}
      className="group flex flex-col gap-2 rounded-2xl"
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-muted">
        {p.cover_url ? (
          <img
            src={p.cover_url}
            alt={p.title}
            loading="lazy"
            className="size-full object-cover transition group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex size-full items-center justify-center bg-sand text-clay">
            <span className="font-serif text-2xl">{p.title.slice(0, 1)}</span>
          </div>
        )}
        <div className="absolute right-2 top-2">
          <Badge variant="secondary" className="gap-1 bg-background/85 text-[10px] font-semibold text-clay backdrop-blur">
            Kenyan-owned
          </Badge>
        </div>
        <div className="absolute left-2 top-2 flex flex-wrap gap-1">
          {p.is_eco && (
            <Badge variant="secondary" className="gap-1 bg-acacia/90 text-accent-foreground">
              <Leaf className="size-3" /> Eco
            </Badge>
          )}
          {p.is_community && (
            <Badge variant="secondary" className="gap-1 bg-clay/90 text-primary-foreground">
              <Users className="size-3" /> Community
            </Badge>
          )}
        </div>
      </div>
      <div className="flex items-start justify-between gap-2 px-0.5">
        <div className="min-w-0">
          <div className="truncate font-medium text-foreground">{p.title}</div>
          <div className="text-sm text-muted-foreground">{p.city}</div>
        </div>
        {p.rating != null && (
          <div className="flex shrink-0 items-center gap-1 text-sm">
            <Star className="size-4 fill-primary text-primary" />
            <span>{p.rating}</span>
            <span className="text-muted-foreground">({p.reviews_count})</span>
          </div>
        )}
      </div>
      <div className="px-0.5 text-sm">
        <span className="font-semibold">{formatKES(p.price_kes)}</span>
        <span className="text-muted-foreground"> / night</span>
      </div>
    </Link>
  );
}
