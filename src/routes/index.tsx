import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { searchProperties } from "@/lib/api/properties.functions";
import { PropertyCard } from "@/components/PropertyCard";
import { SearchBar } from "@/components/SearchBar";
import { CITIES } from "@/lib/constants";
import { Leaf, ShieldCheck, Smartphone, Sparkles } from "lucide-react";

const featuredQO = queryOptions({
  queryKey: ["properties", "featured"],
  queryFn: () => searchProperties({ data: {} }),
});

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Karibu Stays — Find your next stay in Kenya" },
      { name: "description", content: "Browse apartments, lodges, homestays and guest houses across Nairobi, Mombasa, Kisumu and Maasai Mara. Pay with M-Pesa." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(featuredQO),
  component: Index,
  errorComponent: ({ error }) => (
    <div className="p-6 text-sm text-muted-foreground">Couldn't load listings: {error.message}</div>
  ),
});

function Index() {
  const { data: properties } = useSuspenseQuery(featuredQO);
  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-sand via-background to-secondary/40" aria-hidden />
        <div className="relative mx-auto max-w-6xl px-4 pt-8 pb-10 md:pt-16 md:pb-16">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1 text-xs font-medium text-clay shadow-sm">
            <Sparkles className="size-3" /> Karibu — welcome to Kenya
          </span>
          <h1 className="mt-3 font-serif text-4xl leading-tight text-foreground md:text-6xl">
            Stay where Kenya<br />
            <span className="text-primary">feels like home.</span>
          </h1>
          <p className="mt-3 max-w-xl text-base text-muted-foreground md:text-lg">
            Apartments in Nairobi, beach cottages on the coast, lodges by the Mara — booked securely, paid with M-Pesa.
          </p>
          <div className="mt-6 max-w-3xl">
            <SearchBar />
          </div>
          {/* City chips */}
          <ul className="mt-5 -mx-1 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {CITIES.slice(0, 6).map((c) => (
              <li key={c}>
                <Link
                  to="/search"
                  search={{ city: c }}
                  className="inline-flex h-9 items-center rounded-full border border-border bg-card px-4 text-sm font-medium text-foreground hover:border-primary hover:text-primary"
                >
                  {c}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Featured */}
      <section className="mx-auto max-w-6xl px-4 pt-6 pb-12">
        <div className="mb-4 flex items-end justify-between">
          <h2 className="font-serif text-2xl md:text-3xl">Featured stays</h2>
          <Link to="/search" className="text-sm font-medium text-primary hover:underline">View all</Link>
        </div>
        {properties.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
            {properties.slice(0, 8).map((p) => <PropertyCard key={p.id} {...p} />)}
          </div>
        )}
      </section>

      {/* Community / value props */}
      <section className="bg-secondary/30">
        <div className="mx-auto grid max-w-6xl gap-4 px-4 py-10 sm:grid-cols-3">
          <Feature icon={Smartphone} title="M-Pesa first" desc="Pay instantly with M-Pesa STK push. Card payments coming soon." />
          <Feature icon={ShieldCheck} title="Trusted hosts" desc="Verified profiles, real guest reviews, and secure messaging." />
          <Feature icon={Leaf} title="Eco & community" desc="Discover community-run homestays and eco-conscious lodges." />
        </div>
      </section>

      {/* Host CTA */}
      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="rounded-3xl bg-gradient-to-br from-primary to-clay px-6 py-10 text-primary-foreground md:px-10 md:py-14">
          <h3 className="font-serif text-3xl md:text-4xl">Own a property? Earn with Karibu.</h3>
          <p className="mt-2 max-w-xl text-primary-foreground/90">
            List your apartment, lodge or homestay in minutes. Reach travelers across East Africa.
          </p>
          <Link
            to="/host/new"
            className="mt-5 inline-flex h-11 items-center rounded-full bg-background px-6 text-sm font-semibold text-foreground hover:bg-background/90"
          >
            Become a host
          </Link>
        </div>
      </section>
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
