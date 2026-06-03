import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { getProperty } from "@/lib/api/properties.functions";
import { createBooking } from "@/lib/api/bookings.functions";
import { initiateMpesa } from "@/lib/api/payments.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star, MapPin, Users, Bed, Bath, ShieldCheck, Leaf, Wifi } from "lucide-react";
import { formatKES } from "@/lib/constants";
import { supabase } from "@/integrations/supabase/client";

const qo = (id: string) =>
  queryOptions({ queryKey: ["property", id], queryFn: () => getProperty({ data: { id } }) });

export const Route = createFileRoute("/property/$id")({
  loader: ({ params, context }) => context.queryClient.ensureQueryData(qo(params.id)),
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData ? `${loaderData.title} — Karibu Stays` : "Stay" },
      { name: "description", content: loaderData?.description?.slice(0, 160) ?? "" },
      { property: "og:title", content: loaderData?.title ?? "Stay" },
      { property: "og:image", content: loaderData?.cover_url ?? "" },
    ],
  }),
  component: PropertyPage,
  errorComponent: ({ error }) => <div className="p-6">Couldn't load: {error.message}</div>,
  notFoundComponent: () => <div className="p-6">Listing not found.</div>,
});

function PropertyPage() {
  const { id } = Route.useParams();
  const { data: p } = useSuspenseQuery(qo(id));
  const navigate = useNavigate();
  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const [checkIn, setCheckIn] = useState(today);
  const [checkOut, setCheckOut] = useState(tomorrow);
  const [guests, setGuests] = useState(1);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [phone, setPhone] = useState("");

  const book = useServerFn(createBooking);
  const pay = useServerFn(initiateMpesa);

  const bookM = useMutation({
    mutationFn: () =>
      book({ data: { property_id: id, check_in: checkIn, check_out: checkOut, guests } }),
    onSuccess: (b) => {
      setBookingId(b.id);
      toast.success("Booking created. Now pay with M-Pesa to confirm.");
    },
    onError: async (e: Error) => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        toast.error("Please sign in to book");
        navigate({ to: "/auth", search: { redirect: window.location.pathname } });
      } else toast.error(e.message);
    },
  });

  const payM = useMutation({
    mutationFn: () => pay({ data: { booking_id: bookingId!, phone } }),
    onSuccess: (r: any) => {
      if (r.pending_setup) toast.warning(r.message);
      else toast.success("Check your phone for the M-Pesa prompt");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const nights = Math.max(
    1,
    Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000),
  );
  const total = nights * p.price_kes;

  return (
    <main className="mx-auto max-w-6xl px-4 pt-4 pb-24">
      {/* Gallery */}
      <div className="grid gap-2 overflow-hidden rounded-2xl md:grid-cols-4 md:grid-rows-2">
        <div className="relative md:col-span-2 md:row-span-2 aspect-[4/3] md:aspect-auto bg-muted">
          {p.cover_url ? (
            <img src={p.cover_url} alt={p.title} className="size-full object-cover" />
          ) : <div className="flex size-full items-center justify-center bg-sand font-serif text-4xl text-clay">{p.title[0]}</div>}
        </div>
        {p.images.slice(0, 4).map((img: any) => (
          <div key={img.id} className="hidden bg-muted md:block">
            <img src={img.signed_url} alt="" className="size-full object-cover" />
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_360px]">
        {/* Details */}
        <div>
          <div className="flex flex-wrap items-center gap-2">
            {p.is_eco && <Badge className="gap-1 bg-acacia text-accent-foreground"><Leaf className="size-3" /> Eco</Badge>}
            {p.is_community && <Badge variant="secondary">Community-run</Badge>}
            <Badge variant="outline">{p.property_type.replace("_", " ")}</Badge>
          </div>
          <h1 className="mt-2 font-serif text-3xl md:text-4xl">{p.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1"><MapPin className="size-4" /> {p.city}{p.address ? `, ${p.address}` : ""}</span>
            {p.rating && (
              <span className="inline-flex items-center gap-1"><Star className="size-4 fill-primary text-primary" /> {p.rating} · {p.reviews_count} reviews</span>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            <span className="inline-flex items-center gap-1"><Users className="size-4" /> {p.max_guests} guests</span>
            <span className="inline-flex items-center gap-1"><Bed className="size-4" /> {p.bedrooms} bed</span>
            <span className="inline-flex items-center gap-1"><Bath className="size-4" /> {p.bathrooms} bath</span>
          </div>

          {p.host && (
            <div className="mt-6 flex items-center gap-3 rounded-2xl border p-4">
              <Avatar><AvatarImage src={p.host.avatar_url ?? undefined} /><AvatarFallback>{p.host.full_name?.[0] ?? "H"}</AvatarFallback></Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-1.5 font-medium">
                  {p.host.full_name ?? "Host"}
                  {p.host.is_verified && <ShieldCheck className="size-4 text-acacia" />}
                </div>
                <div className="text-xs text-muted-foreground">Hosting since {new Date(p.host.created_at).getFullYear()}</div>
              </div>
            </div>
          )}

          <p className="mt-6 whitespace-pre-line text-foreground/90">{p.description}</p>

          {p.amenities?.length > 0 && (
            <div className="mt-6">
              <h2 className="font-serif text-xl">What this place offers</h2>
              <ul className="mt-3 grid grid-cols-2 gap-2 text-sm">
                {p.amenities.map((a: string) => (
                  <li key={a} className="inline-flex items-center gap-2 rounded-md border p-2">
                    <Wifi className="size-4 text-muted-foreground" /> {a}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {p.landmarks?.length > 0 && (
            <div className="mt-6">
              <h2 className="font-serif text-xl">Nearby</h2>
              <ul className="mt-2 flex flex-wrap gap-2">
                {p.landmarks.map((l: string) => <Badge key={l} variant="outline">{l}</Badge>)}
              </ul>
            </div>
          )}

          {/* Reviews */}
          <div className="mt-8">
            <h2 className="font-serif text-xl">Reviews ({p.reviews_count})</h2>
            {p.reviews.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">No reviews yet. Be the first to stay and review.</p>
            ) : (
              <div className="mt-3 space-y-4">
                {p.reviews.map((r: any) => (
                  <div key={r.id} className="rounded-2xl border p-4">
                    <div className="flex items-center gap-2">
                      <Avatar className="size-8"><AvatarImage src={r.profiles?.avatar_url ?? undefined} /><AvatarFallback>{r.profiles?.full_name?.[0] ?? "G"}</AvatarFallback></Avatar>
                      <div className="text-sm font-medium">{r.profiles?.full_name ?? "Guest"}</div>
                      <div className="ml-auto inline-flex items-center gap-1 text-sm">
                        <Star className="size-4 fill-primary text-primary" /> {r.rating}
                      </div>
                    </div>
                    {r.comment && <p className="mt-2 text-sm text-foreground/90">{r.comment}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Booking card */}
        <aside className="lg:sticky lg:top-20 self-start">
          <div className="rounded-2xl border bg-card p-5 shadow-sm">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-semibold">{formatKES(p.price_kes)}</span>
              <span className="text-muted-foreground">/ night</span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Check-in</Label>
                <Input type="date" min={today} value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Check-out</Label>
                <Input type="date" min={checkIn} value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Guests</Label>
                <Input type="number" min={1} max={p.max_guests} value={guests} onChange={(e) => setGuests(Math.max(1, +e.target.value))} />
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between border-t pt-3 text-sm">
              <span>{formatKES(p.price_kes)} × {nights} {nights === 1 ? "night" : "nights"}</span>
              <span className="font-semibold">{formatKES(total)}</span>
            </div>

            {!bookingId ? (
              <Button className="mt-4 w-full" size="lg" onClick={() => bookM.mutate()} disabled={bookM.isPending}>
                {bookM.isPending ? "Reserving…" : "Reserve"}
              </Button>
            ) : (
              <div className="mt-4 space-y-2">
                <Label className="text-xs">M-Pesa phone</Label>
                <Input placeholder="0712 345 678" value={phone} onChange={(e) => setPhone(e.target.value)} />
                <Button className="w-full" size="lg" onClick={() => payM.mutate()} disabled={payM.isPending || !phone}>
                  {payM.isPending ? "Sending STK push…" : `Pay ${formatKES(total)} with M-Pesa`}
                </Button>
                <Link to="/trips" className="block text-center text-xs text-muted-foreground hover:underline">View my trips</Link>
              </div>
            )}
            <p className="mt-3 text-center text-xs text-muted-foreground">You won't be charged until you confirm payment.</p>
          </div>
        </aside>
      </div>
    </main>
  );
}
