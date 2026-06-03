export const CITIES = [
  "Nairobi",
  "Mombasa",
  "Kisumu",
  "Naivasha",
  "Maasai Mara",
  "Nakuru",
  "Diani",
  "Eldoret",
  "Lamu",
  "Nanyuki",
] as const;

export const AMENITIES = [
  "Wi-Fi",
  "Parking",
  "Breakfast",
  "Kitchen",
  "Air conditioning",
  "Hot water",
  "Pool",
  "Workspace",
  "TV",
  "Washer",
  "Security",
  "Backup power",
] as const;

export const PROPERTY_TYPES = [
  { value: "apartment", label: "Apartment" },
  { value: "lodge", label: "Lodge" },
  { value: "homestay", label: "Homestay" },
  { value: "guest_house", label: "Guest house" },
  { value: "villa", label: "Villa" },
  { value: "cottage", label: "Cottage" },
] as const;

export const formatKES = (n: number) =>
  new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", maximumFractionDigits: 0 }).format(n);
