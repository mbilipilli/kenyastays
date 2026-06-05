import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { Utensils, Hospital, ShoppingBag, Landmark, Fuel, Loader2 } from "lucide-react";

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

type Category = {
  key: string;
  label: string;
  color: string;
  filter: string; // overpass tag filter
  Icon: typeof Utensils;
};

const CATEGORIES: Category[] = [
  { key: "restaurant", label: "Restaurants", color: "#c2410c", filter: 'amenity~"restaurant|cafe|fast_food"', Icon: Utensils },
  { key: "hospital",   label: "Hospitals",   color: "#dc2626", filter: 'amenity~"hospital|clinic|pharmacy"', Icon: Hospital },
  { key: "shop",       label: "Shopping",    color: "#7c3aed", filter: 'shop~"supermarket|mall|convenience"', Icon: ShoppingBag },
  { key: "attraction", label: "Attractions", color: "#0d9488", filter: 'tourism~"attraction|museum|viewpoint|hotel"', Icon: Landmark },
  { key: "fuel",       label: "Fuel/ATM",    color: "#475569", filter: '(amenity~"fuel|atm|bank")', Icon: Fuel },
];

type Place = { id: string; name: string; lat: number; lng: number; category: string; color: string; distanceKm: number };

function haversine(a: [number, number], b: [number, number]) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function coloredIcon(color: string) {
  return L.divIcon({
    className: "",
    html: `<div style="background:${color};width:18px;height:18px;border-radius:50%;border:3px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

const propertyIcon = L.divIcon({
  className: "",
  html: `<div style="background:#e11d48;width:26px;height:26px;border-radius:50%;border:4px solid white;box-shadow:0 2px 6px rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:14px">★</div>`,
  iconSize: [26, 26],
  iconAnchor: [13, 13],
});

export function NearbyMap({ lat, lng, radiusM = 1500, height = 420 }: { lat: number; lng: number; radiusM?: number; height?: number }) {
  const [ready, setReady] = useState(false);
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setReady(true), []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const parts = CATEGORIES.map(
          (c) => `node[${c.filter}](around:${radiusM},${lat},${lng});`,
        ).join("\n");
        const query = `[out:json][timeout:25];(${parts});out body 60;`;
        const res = await fetch("https://overpass-api.de/api/interpreter", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: "data=" + encodeURIComponent(query),
        });
        if (!res.ok) throw new Error("Map data unavailable");
        const json = await res.json();
        const out: Place[] = [];
        for (const el of json.elements ?? []) {
          const tags = el.tags ?? {};
          let cat = CATEGORIES.find((c) => {
            if (c.key === "restaurant") return ["restaurant", "cafe", "fast_food"].includes(tags.amenity);
            if (c.key === "hospital")   return ["hospital", "clinic", "pharmacy"].includes(tags.amenity);
            if (c.key === "shop")       return ["supermarket", "mall", "convenience"].includes(tags.shop);
            if (c.key === "attraction") return tags.tourism;
            if (c.key === "fuel")       return ["fuel", "atm", "bank"].includes(tags.amenity);
            return false;
          });
          if (!cat) continue;
          out.push({
            id: String(el.id),
            name: tags.name ?? cat.label,
            lat: el.lat,
            lng: el.lon,
            category: cat.key,
            color: cat.color,
            distanceKm: haversine([lat, lng], [el.lat, el.lon]),
          });
        }
        out.sort((a, b) => a.distanceKm - b.distanceKm);
        if (!cancelled) setPlaces(out.slice(0, 60));
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [lat, lng, radiusM]);

  const nearestByCat = useMemo(() => {
    const m = new Map<string, Place>();
    for (const p of places) if (!m.has(p.category)) m.set(p.category, p);
    return CATEGORIES.map((c) => ({ cat: c, place: m.get(c.key) }));
  }, [places]);

  if (!ready) return <div style={{ height }} className="animate-pulse rounded-2xl bg-muted" />;

  return (
    <div className="space-y-3">
      <div style={{ height }} className="overflow-hidden rounded-2xl border">
        <MapContainer center={[lat, lng]} zoom={15} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
          <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <Circle center={[lat, lng]} radius={radiusM} pathOptions={{ color: "#e11d48", fillOpacity: 0.05, weight: 1 }} />
          <Marker position={[lat, lng]} icon={propertyIcon}>
            <Popup>Your stay is here</Popup>
          </Marker>
          {places.map((p) => (
            <Marker key={p.id} position={[p.lat, p.lng]} icon={coloredIcon(p.color)}>
              <Popup>
                <div className="space-y-0.5">
                  <div className="font-medium">{p.name}</div>
                  <div className="text-xs text-muted-foreground capitalize">{p.category}</div>
                  <div className="text-xs font-semibold">{p.distanceKm.toFixed(2)} km away</div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {nearestByCat.map(({ cat, place }) => (
          <div key={cat.key} className="flex items-center gap-2 rounded-xl border bg-card p-3 text-sm">
            <span className="flex size-8 items-center justify-center rounded-full" style={{ background: cat.color + "22", color: cat.color }}>
              <cat.Icon className="size-4" />
            </span>
            <div className="min-w-0">
              <div className="truncate font-medium">{cat.label}</div>
              <div className="truncate text-xs text-muted-foreground">
                {loading ? "Searching…" : place ? `${place.name} · ${place.distanceKm.toFixed(2)} km` : "None nearby"}
              </div>
            </div>
          </div>
        ))}
      </div>
      {loading && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-3 animate-spin" /> Finding nearby facilities…
        </div>
      )}
      {error && <div className="text-xs text-destructive">{error}</div>}
    </div>
  );
}
