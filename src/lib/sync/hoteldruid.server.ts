// HotelDruid PMS REST client.
// Live mode requires: HOTELDRUID_BASE_URL (e.g. https://yourhoteldruid.com)
// and HOTELDRUID_API_KEY. Without them we fall back to demo inventory so the
// UI keeps working.

export type HotelDruidRoom = {
  external_id: string;
  hotel_name: string;
  room_type: string;
  city: string;
  price_kes: number;
  availability: Record<string, number>;
  booking_status: "available" | "sold_out";
};

type ApiRoom = {
  room_id: string | number;
  room_type: string;
  availability: number;
  price_kes: number;
  hotel_name?: string;
  city?: string;
};

function config() {
  const baseUrl = process.env.HOTELDRUID_BASE_URL;
  const apiKey = process.env.HOTELDRUID_API_KEY;
  if (!baseUrl || !apiKey) return null;
  return { baseUrl: baseUrl.replace(/\/$/, ""), apiKey };
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

/** GET {base}/api/rooms?date=YYYY-MM-DD */
export async function fetchHotelDruidRooms(date = today()): Promise<HotelDruidRoom[]> {
  const cfg = config();
  if (!cfg) return demoRooms();

  const res = await fetch(`${cfg.baseUrl}/api/rooms?date=${encodeURIComponent(date)}`, {
    headers: { Authorization: `Bearer ${cfg.apiKey}`, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`HotelDruid rooms ${res.status}`);
  const rooms = (await res.json()) as ApiRoom[];
  if (!Array.isArray(rooms)) throw new Error("Unexpected HotelDruid response");

  const defaultHotel = process.env.HOTELDRUID_HOTEL_NAME ?? "Kenya Stays Partner Hotel";
  const defaultCity = process.env.HOTELDRUID_CITY ?? "Nairobi";

  return rooms.map((r) => ({
    external_id: String(r.room_id),
    hotel_name: r.hotel_name ?? defaultHotel,
    room_type: r.room_type,
    city: r.city ?? defaultCity,
    price_kes: Math.round(Number(r.price_kes) || 0),
    availability: { [date]: Number(r.availability) || 0 },
    booking_status: Number(r.availability) > 0 ? "available" : "sold_out",
  }));
}

/** POST {base}/api/bookings — push a paid booking back to the PMS. */
export async function createHotelDruidBooking(input: {
  room_id: string;
  guest_name: string;
  guest_phone?: string;
  check_in: string;
  check_out: string;
  payment_status?: "Paid" | "Pending";
}) {
  const cfg = config();
  if (!cfg) return { ok: false as const, skipped: true as const, reason: "HotelDruid not configured" };

  const res = await fetch(`${cfg.baseUrl}/api/bookings`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      room_id: input.room_id,
      guest_name: input.guest_name,
      guest_phone: input.guest_phone,
      check_in: input.check_in,
      check_out: input.check_out,
      payment_status: input.payment_status ?? "Paid",
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as any)?.message ?? `HotelDruid booking ${res.status}`);
  return { ok: true as const, skipped: false as const, response: json };
}

// ---- demo fallback ----
// Deterministic pseudo-randomness: SSR and client must agree.
function seededInt(key: string, max: number) {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % max;
}

function nextDates(seed: string, days = 30) {
  const out: Record<string, number> = {};
  const now = new Date();
  for (let i = 0; i < days; i++) {
    const d = new Date(now.getTime() + i * 86400_000).toISOString().slice(0, 10);
    out[d] = seededInt(`${seed}:${d}`, 4);
  }
  return out;
}

const SEED: Omit<HotelDruidRoom, "availability" | "booking_status">[] = [
  { external_id: "hd-101", hotel_name: "Karibu Homestay", room_type: "Family Room", city: "Nairobi", price_kes: 6500 },
  { external_id: "hd-102", hotel_name: "Watamu Beach Cottage", room_type: "Beachfront Studio", city: "Watamu", price_kes: 9800 },
  { external_id: "hd-103", hotel_name: "Nakuru Lakeside", room_type: "Standard Double", city: "Nakuru", price_kes: 5400 },
];

function demoRooms(): HotelDruidRoom[] {
  return SEED.map((s) => ({
    ...s,
    availability: nextDates(s.external_id),
    booking_status: seededInt(`${s.external_id}:status`, 10) > 1 ? "available" : "sold_out",
  }));
}
