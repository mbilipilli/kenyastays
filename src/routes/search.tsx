import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { zodValidator } from "@tanstack/zod-adapter";
import { useState } from "react";
import { searchProperties } from "@/lib/api/properties.functions";
import { PropertyCard } from "@/components/PropertyCard";
import { SearchBar } from "@/components/SearchBar";
import { LiveMap } from "@/components/LiveMap";
import { Footer } from "@/components/Footer";
import { CsrStories } from "@/components/CsrStories";
import { AMENITIES, CITIES, PROPERTY_TYPES, formatKES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { SlidersHorizontal, Leaf, Map as MapIcon, LayoutGrid } from "lucide-react";

const searchSchema = z.object({
  city: z.string().optional(),
  q: z.string().optional(),
  minPrice: z.coerce.number().int().optional(),
  maxPrice: z.coerce.number().int().optional(),
  amenities: z.array(z.string()).optional(),
  guests: z.coerce.number().int().optional(),
  eco: z.coerce.boolean().optional(),
  type: z.enum(["apartment","lodge","homestay","guest_house","villa","cottage"]).optional(),
});

const qo = (search: z.infer<typeof searchSchema>) =>
  queryOptions({
    queryKey: ["properties", "search", search],
    queryFn: () => searchProperties({ data: search }),
  });

export const Route = createFileRoute("/search")({
  validateSearch: zodValidator(searchSchema),
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => context.queryClient.ensureQueryData(qo(deps)),
  head: ({ loaderData }) => ({
    meta: [
      { title: "Explore Kenyan stays — Mbilipilli Stays" },
      { name: "description", content: `Browse ${loaderData?.length ?? 0} verified listings across Kenya.` },
    ],
  }),
  component: SearchPage,
  errorComponent: ({ error }) => <div className="p-6 text-sm">Error: {error.message}</div>,
});

function SearchPage() {
  const search = Route.useSearch();
  const { data: results } = useSuspenseQuery(qo(search));
  const [view, setView] = useState<"grid" | "map">("grid");

  return (
    <>
      <main className="mx-auto max-w-6xl px-4 pt-4 pb-12">
        <SearchBar initialCity={search.city ?? ""} initialQ={search.q ?? ""} />

        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {results.length} {results.length === 1 ? "stay" : "stays"} found
            {search.city ? ` in ${search.city}` : ""}
          </p>
          <div className="flex items-center gap-2">
            <div className="hidden rounded-full border bg-card p-0.5 sm:flex">
              <button
                onClick={() => setView("grid")}
                className={`inline-flex h-8 items-center gap-1 rounded-full px-3 text-xs font-medium ${view === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
              >
                <LayoutGrid className="size-3.5" /> Grid
              </button>
              <button
                onClick={() => setView("map")}
                className={`inline-flex h-8 items-center gap-1 rounded-full px-3 text-xs font-medium ${view === "map" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
              >
                <MapIcon className="size-3.5" /> Map
              </button>
            </div>
            <FilterSheet />
          </div>
        </div>

        {results.length === 0 ? (
          <div className="mt-12 rounded-2xl border border-dashed p-10 text-center text-muted-foreground">
            No stays match those filters yet. Try widening your search.
          </div>
        ) : view === "map" ? (
          <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_360px]">
            <LiveMap points={results} height={620} />
            <div className="max-h-[620px] space-y-3 overflow-y-auto pr-1">
              {results.map((p) => <PropertyCard key={p.id} {...p} />)}
            </div>
          </div>
        ) : (
          <>
            <div className="mt-5 grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
              {results.map((p) => <PropertyCard key={p.id} {...p} />)}
            </div>
            <div className="mt-10">
              <h2 className="mb-3 font-serif text-xl">Stays on the map</h2>
              <LiveMap points={results} height={380} />
            </div>
          </>
        )}
        <div className="mt-12">
          <CsrStories />
        </div>
      </main>
      <Footer />
    </>
  );
}

function FilterSheet() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const [open, setOpen] = useState(false);
  const [minPrice, setMin] = useState(search.minPrice?.toString() ?? "");
  const [maxPrice, setMax] = useState(search.maxPrice?.toString() ?? "");
  const [guests, setGuests] = useState(search.guests?.toString() ?? "");
  const [amenities, setAmen] = useState<string[]>(search.amenities ?? []);
  const [eco, setEco] = useState(!!search.eco);
  const [city, setCity] = useState(search.city ?? "");
  const [ptype, setPtype] = useState<string>(search.type ?? "");

  function apply() {
    navigate({
      search: {
        ...search,
        city: city || undefined,
        type: (ptype || undefined) as any,
        minPrice: minPrice ? Number(minPrice) : undefined,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
        guests: guests ? Number(guests) : undefined,
        amenities: amenities.length ? amenities : undefined,
        eco: eco || undefined,
      },
    });
    setOpen(false);
  }
  function reset() {
    setMin(""); setMax(""); setGuests(""); setAmen([]); setEco(false); setCity(""); setPtype("");
    navigate({ search: {} });
    setOpen(false);
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <SlidersHorizontal className="size-4" /> Filters
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[85vh] overflow-y-auto rounded-t-2xl sm:max-w-md sm:rounded-t-none">
        <SheetHeader><SheetTitle>Filter stays</SheetTitle></SheetHeader>
        <div className="mt-4 space-y-5">
          <div>
            <Label>City</Label>
            <select value={city} onChange={(e) => setCity(e.target.value)} className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm">
              <option value="">Any</option>
              {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <Label>Property type</Label>
            <select value={ptype} onChange={(e) => setPtype(e.target.value)} className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm">
              <option value="">Any type</option>
              {PROPERTY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <Label>Price per night (KES)</Label>
            <div className="mt-1 flex items-center gap-2">
              <Input type="number" placeholder="Min" value={minPrice} onChange={(e) => setMin(e.target.value)} />
              <span>—</span>
              <Input type="number" placeholder="Max" value={maxPrice} onChange={(e) => setMax(e.target.value)} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">e.g. {formatKES(3000)} – {formatKES(15000)}</p>
          </div>
          <div>
            <Label>Guests</Label>
            <Input type="number" min={1} value={guests} onChange={(e) => setGuests(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Amenities</Label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {AMENITIES.map((a) => (
                <label key={a} className="flex items-center gap-2 rounded-md border p-2 text-sm">
                  <Checkbox
                    checked={amenities.includes(a)}
                    onCheckedChange={(v) =>
                      setAmen(v ? [...amenities, a] : amenities.filter((x) => x !== a))
                    }
                  />
                  {a}
                </label>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 rounded-md border p-3">
            <Checkbox checked={eco} onCheckedChange={(v) => setEco(!!v)} />
            <Leaf className="size-4 text-acacia" />
            <span className="text-sm">Eco-friendly stays only</span>
          </label>
        </div>
        <div className="sticky bottom-0 -mx-6 mt-6 flex gap-2 border-t bg-background p-4">
          <Button variant="ghost" className="flex-1" onClick={reset}>Reset</Button>
          <Button className="flex-1" onClick={apply}>Show stays</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
