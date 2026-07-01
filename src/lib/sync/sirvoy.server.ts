// Mock Sirvoy Pro REST client. Swap fetch URL when real API keys are added.
export type SirvoyRoom = {
  external_id: string;
  hotel_name: string;
  room_type: string;
  city: string;
  price: number;
  currency: "USD" | "EUR";
  availability: Record<string, number>;
  booking_status: "available" | "sold_out";
};

function nextDates(days = 30) {
  const out: Record<string, number> = {};
  const now = new Date();
  for (let i = 0; i < days; i++) {
    const d = new Date(now.getTime() + i * 86400_000).toISOString().slice(0, 10);
    out[d] = Math.floor(Math.random() * 5) + 1;
  }
  return out;
}

const SEED: Omit<SirvoyRoom, "availability" | "booking_status">[] = [
  { external_id: "srv-001", hotel_name: "Sarova Stanley", room_type: "Deluxe King", city: "Nairobi", price: 180, currency: "USD" },
  { external_id: "srv-002", hotel_name: "Serena Beach Resort", room_type: "Ocean Suite", city: "Mombasa", price: 240, currency: "EUR" },
  { external_id: "srv-003", hotel_name: "Mara Explorer Camp", room_type: "Luxury Tent", city: "Maasai Mara", price: 420, currency: "USD" },
  { external_id: "srv-004", hotel_name: "Diani Reef", room_type: "Garden View", city: "Diani", price: 155, currency: "USD" },
];

export async function fetchSirvoyRooms(): Promise<SirvoyRoom[]> {
  // Real impl: fetch(`${SIRVOY_API}/rooms`, { headers: { Authorization: `Bearer ${process.env.SIRVOY_API_KEY}` } })
  return SEED.map((s) => ({
    ...s,
    availability: nextDates(),
    booking_status: Math.random() > 0.15 ? "available" : "sold_out",
  }));
}
