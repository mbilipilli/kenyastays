import { lazy, Suspense, useEffect, useState } from "react";

const Impl = lazy(() => import("./NearbyMapImpl").then((m) => ({ default: m.NearbyMap })));

export function NearbyMap({
  lat,
  lng,
  radiusM = 1500,
  height = 420,
}: {
  lat: number;
  lng: number;
  radiusM?: number;
  height?: number;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const skeleton = <div style={{ height }} className="animate-pulse rounded-2xl bg-muted" />;
  if (!mounted) return skeleton;
  return (
    <Suspense fallback={skeleton}>
      <Impl lat={lat} lng={lng} radiusM={radiusM} height={height} />
    </Suspense>
  );
}
