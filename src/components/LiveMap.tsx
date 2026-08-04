import { lazy, Suspense, useEffect, useState } from "react";
import type { MapPoint } from "./LiveMapImpl";

export type { MapPoint };

const Impl = lazy(() => import("./LiveMapImpl").then((m) => ({ default: m.LiveMap })));

export function LiveMap({ points, height = 360 }: { points: MapPoint[]; height?: number }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const skeleton = <div style={{ height }} className="animate-pulse rounded-2xl bg-muted" />;
  if (!mounted) return skeleton;
  return (
    <Suspense fallback={skeleton}>
      <Impl points={points} height={height} />
    </Suspense>
  );
}
