import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Link } from "@tanstack/react-router";
import { formatKES } from "@/lib/constants";

// Fix default marker icons in bundlers
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const CITY_COORDS: Record<string, [number, number]> = {
  Nairobi: [-1.2921, 36.8219],
  Mombasa: [-4.0435, 39.6682],
  Kisumu: [-0.0917, 34.768],
  Nakuru: [-0.3031, 36.08],
  Eldoret: [0.5143, 35.2698],
  "Maasai Mara": [-1.5061, 35.1432],
  Naivasha: [-0.7172, 36.4314],
  Diani: [-4.2767, 39.5933],
  Lamu: [-2.2696, 40.902],
  Nanyuki: [0.0167, 37.0731],
};

export type MapPoint = {
  id: string;
  title: string;
  city: string;
  price_kes: number;
  latitude: number | null;
  longitude: number | null;
};

function jitter(seed: string) {
  // Stable pseudo-random offset so unmapped listings don't all stack
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  const r1 = ((h & 0xffff) / 0xffff - 0.5) * 0.08;
  const r2 = (((h >> 16) & 0xffff) / 0xffff - 0.5) * 0.08;
  return [r1, r2] as const;
}

export function LiveMap({ points, height = 360 }: { points: MapPoint[]; height?: number }) {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  if (!ready) return <div style={{ height }} className="animate-pulse rounded-2xl bg-muted" />;

  const located = points.map((p) => {
    if (p.latitude != null && p.longitude != null) {
      return { ...p, lat: p.latitude, lng: p.longitude };
    }
    const base = CITY_COORDS[p.city] ?? [-1.286389, 36.817223];
    const [dx, dy] = jitter(p.id);
    return { ...p, lat: base[0] + dx, lng: base[1] + dy };
  });

  const center: [number, number] = located.length
    ? [located[0].lat, located[0].lng]
    : [-1.286389, 36.817223];

  return (
    <div style={{ height }} className="overflow-hidden rounded-2xl border">
      <MapContainer center={center} zoom={located.length > 1 ? 6 : 12} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {located.map((p) => (
          <Marker key={p.id} position={[p.lat, p.lng]}>
            <Popup>
              <div className="space-y-1">
                <Link to="/property/$id" params={{ id: p.id }} className="font-medium text-primary hover:underline">
                  {p.title}
                </Link>
                <div className="text-xs text-muted-foreground">{p.city}</div>
                <div className="text-sm font-semibold">{formatKES(p.price_kes)} / night</div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
