import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { searchProperties } from "@/lib/api/properties.functions";
import { listHotelDruidFeatured } from "@/lib/api/sync.functions";
import { PropertyCard } from "@/components/PropertyCard";
import { HotelDruidCard } from "@/components/HotelDruidCard";

import { SearchBar } from "@/components/SearchBar";
import { LiveMap } from "@/components/LiveMap";
import { Footer } from "@/components/Footer";
import { Logo } from "@/components/Logo";
import { Leaf, ShieldCheck, Smartphone, Star, Handshake, MapPin, CalendarDays } from "lucide-react";
import heroImg from "@/assets/hero-savanna.jpg";

const featuredQO = queryOptions({
  queryKey: ["properties", "featured"],
  queryFn: () => searchProperties({ data: {} }),
});

const hotelDruidQO = queryOptions({
  queryKey: ["hoteldruid", "featured"],
  queryFn: () => listHotelDruidFeatured(),
});


const CITY_CHIPS = [
  { name: "Nairobi", emoji: "🏙️" },
  { name: "Mombasa", emoji: "🌊" },
  { name: "Kisumu", emoji: "🌅" },
  { name: "Maasai Mara", emoji: "🦁" },
  { name: "Eldoret", emoji: "🌾" },
  { name: "Nakuru", emoji: "🦩" },
] as const;

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Kenya Stays — Stay Local. Stay Kenyan." },
      { name: "description", content: "Find authentic Kenyan stays — Nairobi apartments, Mombasa beach cottages and Maasai Mara lodges. Trusted hosts, secure M-Pesa payments." },
      { property: "og:title", content: "Kenya Stays — Stay Local. Stay Kenyan." },
      { property: "og:description", content: "Authentic Kenyan stays from Nairobi to the Maasai Mara, booked securely with M-Pesa or card." },
      { property: "og:url", content: "https://kenyastayske.lovable.app/" },
    ],
    links: [{ rel: "canonical", href: "https://kenyastayske.lovable.app/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Organization",
              name: "Kenya Stays",
              url: "https://kenyastayske.lovable.app/",
              slogan: "Stay Local. Stay Kenyan.",
              areaServed: "KE",
            },
            {
              "@type": "WebSite",
              name: "Kenya Stays",
              url: "https://kenyastayske.lovable.app/",
              potentialAction: {
                "@type": "SearchAction",
                target: "https://kenyastayske.lovable.app/search?q={search_term_string}",
                "query-input": "required name=search_term_string",
              },
            },
          ],
        }),
      },
    ],
  }),

  loader: ({ context }) => {
    context.queryClient.ensureQueryData(featuredQO);
    context.queryClient.prefetchQuery(hotelDruidQO);
  },

  component: Index,
  errorComponent: ({ error }) => (
    <div className="p-6 text-sm text-muted-foreground">Couldn't load listings: {error.message}</div>
  ),
});

function Index() {
  const { data: properties } = useSuspenseQuery(featuredQO);
  const { data: hdRooms } = useSuspenseQuery(hotelDruidQO);

  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden">
          <img src={heroImg} alt="" className="size-full object-cover animate-ken-burns" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/60 to-background" />
          <div className="absolute inset-0 animate-hero-shimmer bg-gradient-to-tr from-primary/20 via-transparent to-acacia/20 mix-blend-overlay" />
        </div>
        <div className="relative mx-auto max-w-6xl px-4 pt-10 pb-12 md:pt-20 md:pb-20">
          <div className="flex flex-col items-center text-center">
            <Logo className="size-20 drop-shadow-lg md:size-24" />
            <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-card/90 px-3 py-1 text-xs font-medium text-clay shadow-sm backdrop-blur">
              🌍 Stay Local. Stay Kenyan.
            </span>
            <h1 className="mt-4 max-w-3xl font-serif text-4xl leading-tight text-foreground md:text-6xl">
              Discover Your Perfect <span className="text-primary">Stay in Kenya</span>
            </h1>
            <p className="mt-3 max-w-xl text-base text-foreground/80 md:text-lg">
              Trusted local hosts, instant M-Pesa payments, and real-time availability across Kenya.
            </p>
            <Link
              to="/search"
              className="mt-5 inline-flex h-12 items-center rounded-full bg-primary px-7 text-sm font-semibold text-primary-foreground shadow-md hover:bg-primary/90"
            >
              Book Now
            </Link>

          </div>

          <div className="mt-8 max-w-3xl mx-auto">
            <SearchBar />
          </div>

          {/* City chips */}
          <ul className="mt-5 -mx-1 flex justify-start gap-2 overflow-x-auto pb-1 sm:justify-center scrollbar-none">
            {CITY_CHIPS.map((c) => (
              <li key={c.name} className="shrink-0">
                <Link
                  to="/search"
                  search={{ city: c.name }}
                  className="inline-flex h-10 items-center gap-1.5 rounded-full border border-border bg-card/95 px-4 text-sm font-medium text-foreground shadow-sm backdrop-blur hover:border-primary hover:text-primary"
                >
                  <span>{c.emoji}</span> {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Explore by city */}
      <section className="mx-auto max-w-6xl px-4 pt-10">
        <h2 className="font-serif text-2xl md:text-3xl">Explore by city</h2>
        <p className="mt-1 text-sm text-muted-foreground">Choose your destination and filter by price, amenities, and eco‑friendly options.</p>
      </section>

      {/* Featured */}
      {!isAdmin && (
      <section className="mx-auto max-w-6xl px-4 pt-6 pb-10">
        <div className="mb-4 flex items-end justify-between">
          <h2 className="font-serif text-2xl md:text-3xl">Featured stays</h2>
          <Link to="/search" className="text-sm font-medium text-primary hover:underline">View all →</Link>
        </div>
        {properties.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
            {properties.slice(0, 8).map((p) => <PropertyCard key={p.id} {...p} />)}
          </div>
        )}
      </section>
      )}

      {/* HotelDruid live inventory */}
      {!isAdmin && hdRooms.length > 0 && (
        <section className="bg-sand/40">
          <div className="mx-auto max-w-6xl px-4 py-10">
            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
                <h2 className="font-serif text-2xl md:text-3xl">Featured stays — live across Kenya</h2>
                <p className="mt-1 text-sm text-muted-foreground">Real-time rooms & rates synced securely from partner PMS.</p>
              </div>
              <span className="hidden shrink-0 rounded-full bg-acacia/15 px-3 py-1 text-xs font-medium text-accent sm:inline">
                Live sync
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
              {hdRooms.slice(0, 8).map((r) => <HotelDruidCard key={r.external_id} {...r} />)}
            </div>
          </div>
        </section>
      )}




      {/* Live Map */}
      {properties.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-8">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <h2 className="font-serif text-2xl md:text-3xl">Visualize your stay</h2>
              <p className="mt-1 text-sm text-muted-foreground">Explore nearby homes, attractions, and travel distances in real time.</p>
            </div>
            <MapPin className="size-6 text-primary" />
          </div>
          <LiveMap points={properties} height={420} />
        </section>
      )}

      {/* Trust & Safety */}
      <section className="bg-secondary/30">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <h2 className="font-serif text-2xl md:text-3xl">Trust & safety, always.</h2>
          <p className="mt-1 text-sm text-muted-foreground">Verified hosts, secure M‑Pesa & card payments, and guest reviews ensure peace of mind.</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Feature icon={ShieldCheck} title="Verified hosts" desc="ID-checked profiles you can trust before you book." />
            <Feature icon={Smartphone} title="M-Pesa first" desc="STK push payments — pay instantly from your phone." />
            <Feature icon={Star} title="Real reviews" desc="Honest feedback from guests who actually stayed." />
            <Feature icon={CalendarDays} title="Real-time availability" desc="Smart calendar — no double bookings, ever." />
          </div>
        </div>
      </section>

      {/* Community & Culture */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="grid items-center gap-8 md:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-acacia/10 px-3 py-1 text-xs font-medium text-accent">
              <Leaf className="size-3" /> Community & culture
            </span>
            <h2 className="mt-3 font-serif text-3xl md:text-4xl">Stay close to Kenyan culture.</h2>
            <p className="mt-3 text-foreground/80">
              From matatu art in Nairobi to Eldoret's highland charm, Nakuru's flamingo lakes, and coastal Swahili heritage —
              Kenya Stays connects you to stays where the country feels like home.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {["Matatu art", "Swahili coast", "Rift Valley", "Highland farms", "Mara plains"].map((t) => (
                <span key={t} className="rounded-full border border-border bg-card px-3 py-1 text-xs">{t}</span>
              ))}
            </div>
          </div>
          <div className="rounded-3xl bg-gradient-to-br from-primary/15 via-acacia/15 to-sand p-6 md:p-8">
            <div className="grid grid-cols-2 gap-3">
              <Stat icon={Handshake} label="Community-run stays" value="120+" />
              <Stat icon={Leaf} label="Eco-friendly" value="80+" />
              <Stat icon={ShieldCheck} label="Verified hosts" value="95%" />
              <Stat icon={MapPin} label="Kenyan cities" value="10+" />
            </div>
          </div>
        </div>
      </section>


      <Footer />
    </main>
  );
}

function Feature({ icon: Icon, title, desc }: { icon: typeof Leaf; title: string; desc: string }) {
  return (
    <div className="rounded-2xl bg-card p-5 shadow-sm">
      <Icon className="size-6 text-primary" />
      <h3 className="mt-3 font-serif text-lg">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Leaf; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-card/80 p-4 backdrop-blur">
      <Icon className="size-5 text-primary" />
      <div className="mt-2 font-serif text-2xl">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
      <p className="text-muted-foreground">No listings yet. Hosts — be the first to list your space.</p>
      <Link to="/host/new" className="mt-3 inline-block text-sm font-semibold text-primary hover:underline">
        Create the first listing →
      </Link>
    </div>
  );
}
