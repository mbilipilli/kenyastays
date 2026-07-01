// Mock HotelDruid REST client. Real impl calls the PMS XML/JSON endpoint.
export type HotelDruidRoom = {
  external_id: string;
  hotel_name: string;
  room_type: string;
  city: string;
  price_kes: number;
  availability: Record<string, number>;
  booking_status: "available" | "sold_out";
};

function nextDates(days = 30) {
  const out: Record<string, number> = {};
  const now = new Date();
  for (let i = 0; i < days; i++) {
    const d = new Date(now.getTime() + i * 86400_000).toISOString().slice(0, 10);
    out[d] = Math.floor(Math.random() * 4);
  }
  return out;
}

const SEED: Omit<HotelDruidRoom, "availability" | "booking_status">[] = [
  { external_id: "hd-101", hotel_name: "Karibu Homestay", room_type: "Family Room", city: "Nairobi", price_kes: 6500 },
  { external_id: "hd-102", hotel_name: "Watamu Beach Cottage", room_type: "Beachfront Studio", city: "Watamu", price_kes: 9800 },
  { external_id: "hd-103", hotel_name: "Nakuru Lakeside", room_type: "Standard Double", city: "Nakuru", price_kes: 5400 },
];

export async function fetchHotelDruidRooms(): Promise<HotelDruidRoom[]> {
  return SEED.map((s) => ({
    ...s,
    availability: nextDates(),
    booking_status: Math.random() > 0.2 ? "available" : "sold_out",
  }));
}
