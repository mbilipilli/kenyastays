
## Goal

Enhance the existing Mbilipilli Stays homepage with a HotelDruid-powered "Featured Stays" section and a refreshed hero, without removing the trust, community, live map, or host sections already on the page. Keep the current mock HotelDruid client so nothing breaks; wire real APIUSER/APIPASS later.

## Scope

Only `src/routes/index.tsx` + one thin server function + one card component. No schema changes, no auth changes, no removed sections.

## Changes

### 1. Hero refresh (in place)
- Keep the existing `heroImg` + Ken Burns effect and city chips.
- Update headline to: **"Discover Your Perfect Stay in Kenya"**.
- Sub-copy: **"Real-time availability powered by HotelDruid + Sirvoy Pro."**
- Keep existing "Book Your Stay" CTA (already links to `/search`) and relabel to **"Book Now"**.
- Leave logo, chips, search bar, and gradient overlays untouched.

### 2. Search bar
- Keep current `<SearchBar />` (Destination + free-text). Add Check-in / Check-out / Guests as a follow-up if you want — flagged as out of scope for this pass so we don't break the mobile layout.

### 3. New section: "Featured Stays — Live from HotelDruid"
- Insert between the existing **Featured stays** section (internal listings) and the **Live Map** section.
- New public server function `listHotelDruidFeatured` in `src/lib/api/sync.functions.ts` (no auth middleware; read-only) that:
  - Calls the existing mock `fetchHotelDruidRooms()` from `src/lib/sync/hoteldruid.server.ts`.
  - Returns a client-safe DTO: `{ external_id, hotel_name, room_type, city, price_kes, booking_status, thumbnail }`.
  - Adds a stable placeholder thumbnail (Unsplash Kenya-themed) keyed off `external_id` until real image URLs come from HotelDruid.
- New component `src/components/HotelDruidCard.tsx`: image, hotel name + room type, city, KES price, availability badge (green "Available" / amber "Sold out"), and **"Book Now"** button that navigates to `/search?q={hotel_name}` (matches your "in-app booking with M-Pesa" preference — surfaces the internal booking flow instead of an external HotelDruid link).
- Grid: 2 cols on mobile, 3 on md, 4 on lg — matches existing card grid style.
- Loaded via `queryOptions` + `ensureQueryData` + `useSuspenseQuery` (same pattern as the existing `featuredQO`).

### 4. Footer
- Existing `<Footer />` already covers logo + tagline, quick links, and social icons (WhatsApp, LinkedIn, Instagram). Add a small bottom strip inside `Footer.tsx`: **"Powered by HotelDruid + Sirvoy Pro — secure API sync"** above the copyright line. Swap Instagram for YouTube per the brief (keep WhatsApp + LinkedIn).

## Real-credential seam (later, no-op now)
When you're ready:
1. Add secrets `HOTELDRUID_BASE_URL`, `HOTELDRUID_APIUSER`, `HOTELDRUID_APIPASS` via the secure form.
2. Replace `fetchHotelDruidRooms()` body in `src/lib/sync/hoteldruid.server.ts` with a real `fetch(${BASE_URL}/webservice.php?cmd=get_rooms)` using Basic Auth, mapped to the same DTO.
3. Nothing else changes — the homepage, card, and server function already consume the DTO shape.

## Out of scope for this pass
- Expanded search (Check-in / Check-out / Guests pickers) — say the word and I'll do it as a follow-up on the SearchBar component.
- Mirroring HotelDruid rooms as real bookable `properties` rows (needed if you want true in-app M-Pesa checkout against a HotelDruid room). Currently "Book Now" points into your internal search; the mirror step is a separate task once real credentials are in.
