Big scope — breaking into 4 shippable phases so you can review as we go. Everything below is **additive** to the existing platform (properties, bookings, monetization, RLS already in place).

## Phase 1 — Kenyan visual redesign (foundation)
Applied first so all new UI inherits the palette.

- New tokens in `src/styles.css` (oklch):
  - Terracotta primary `oklch(0.62 0.16 40)`, savanna gold accent `oklch(0.78 0.14 85)`, acacia green `oklch(0.48 0.10 145)`, warm sand background `oklch(0.98 0.01 75)`, deep espresso foreground.
  - Gradients: `--gradient-sunset` (terracotta→gold), `--gradient-savanna` (gold→green).
  - Shadow: `--shadow-warm` tinted with terracotta.
- Typography via `@fontsource`: **Fraunces** (display, editorial serif with warmth) + **DM Sans** (body). Installed with `bun add @fontsource/fraunces @fontsource/dm-sans`, imported in `src/main.tsx`, wired into `src/styles.css` `@theme`.
- Refresh `TopBar`, `Footer`, `Logo`, hero on `/`, property cards to use new tokens. No hardcoded colors.

## Phase 2 — Sirvoy + HotelDruid sync scaffolding (mocked)

**DB migration** (new tables):
- `external_listings` — `source` enum (`sirvoy`|`hoteldruid`), `external_id`, `hotel_name`, `room_type`, `price_native`, `currency`, `price_kes`, `availability` jsonb (date→count), `raw` jsonb, `synced_at`, optional `property_id` link.
- `sync_runs` — `source`, `started_at`, `finished_at`, `status`, `items_upserted`, `error`.
- `fx_rates` — `base`, `quote`, `rate`, `fetched_at`.
- Admin-only RLS (`has_role(auth.uid(),'admin')`), plus `GRANT`s.

**Code**:
- `src/lib/sync/sirvoy.server.ts`, `src/lib/sync/hoteldruid.server.ts` — mock fetchers returning realistic fake inventory. Structure ready to swap in real REST clients.
- `src/lib/sync/fx.server.ts` — fetch USD/EUR→KES from `open.er-api.com` (free, no key), cache in `fx_rates`, fallback to last known.
- `src/lib/api/sync.functions.ts` — `runSync({source})` admin-gated server fn (uses `has_role`), plus `getSyncStatus()`.
- Cron: server route `src/routes/api/public/hooks/sync-listings.ts` verifying `apikey` header, calling both sources + FX refresh. `pg_cron` job scheduled every 2h via `supabase--insert`.

## Phase 3 — Admin dashboard
- User-role gate: add `admin` check to a new pathless layout `src/routes/_authenticated/admin/route.tsx`.
- `src/routes/_authenticated/admin/index.tsx` — header + KPI cards (Active Listings, Bookings Today, Revenue KES, Sync Status) using `recharts` (already available via shadcn chart).
- Tabs/panels: Bookings Monitor, Payments & Payouts, Analytics (occupancy + revenue line/bar), Host Management (approve listing, verify KYC toggle on `profiles.is_verified`), Guest Insights, System Sync Status (last run per source + manual "Run now" button).
- New server fns in `src/lib/api/admin.functions.ts` — all guarded by `has_role(...,'admin')`.
- Data-bridge diagram: simple SVG showing Sirvoy ↔ Bridge ↔ HotelDruid with animated arrows.
- Bootstrap: first admin promoted via SQL prompt after migration.

## Phase 4 — M-Pesa Daraja (real)
Requires **your Safaricom Daraja credentials**. I'll:
1. Ask you to add secrets: `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`, `MPESA_SHORTCODE`, `MPESA_PASSKEY`, `MPESA_ENV` (`sandbox`|`production`).
2. Build:
   - `src/lib/mpesa/daraja.server.ts` — OAuth token, STK Push, query status.
   - Server fn `initiateMpesaPayment({booking_id, phone})` — records row in `payments` (existing table), calls STK Push, stores `CheckoutRequestID`.
   - Public route `src/routes/api/public/hooks/mpesa-callback.ts` — validates callback, updates `payments` + booking status to `confirmed` on success. No signature (Daraja doesn't sign; we validate `CheckoutRequestID` + IP allowlist optional).
3. Wire the existing checkout on `property.$id.tsx` to show M-Pesa (default), Card (stub "coming soon"), PayPal (stub) — track-only fallback so flow still completes if Daraja not configured.

## Technical notes
- Sync workers use `supabaseAdmin` inside handlers only (never module scope).
- FX conversion: `price_kes = round(price_native * rate)`; stored so admin queries are cheap.
- Cron URL: `https://project--4775c4eb-263c-4831-a768-038a33a5e678.lovable.app/api/public/hooks/sync-listings`.
- No changes to existing bookings/monetization flow — Sirvoy/HotelDruid inventory shown as a separate "External inventory" panel in admin until you decide to merge into main search.

## Order of execution
1. Phase 1 (redesign) — no approval needed after this plan.
2. Phase 2 migration → wait for approval → code + cron.
3. Phase 3 admin — includes prompt to promote your account to admin.
4. Phase 4 M-Pesa — I'll request Daraja secrets when we reach it.

Reply "go" to start with Phase 1, or tell me to reorder/trim.