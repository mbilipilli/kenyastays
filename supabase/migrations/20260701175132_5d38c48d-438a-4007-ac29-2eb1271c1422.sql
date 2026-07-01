
-- Enum for sync source
DO $$ BEGIN CREATE TYPE public.sync_source AS ENUM ('sirvoy','hoteldruid'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.sync_status AS ENUM ('running','success','error'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- External listings from Sirvoy Pro / HotelDruid
CREATE TABLE IF NOT EXISTS public.external_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source public.sync_source NOT NULL,
  external_id TEXT NOT NULL,
  hotel_name TEXT NOT NULL,
  room_type TEXT NOT NULL,
  city TEXT,
  price_native NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL,
  price_kes INTEGER NOT NULL,
  availability JSONB NOT NULL DEFAULT '{}'::jsonb,
  booking_status TEXT NOT NULL DEFAULT 'available',
  raw JSONB,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(source, external_id)
);
GRANT SELECT ON public.external_listings TO authenticated;
GRANT ALL ON public.external_listings TO service_role;
ALTER TABLE public.external_listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "external_listings admin read" ON public.external_listings FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER external_listings_touch BEFORE UPDATE ON public.external_listings FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Sync runs (history)
CREATE TABLE IF NOT EXISTS public.sync_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source public.sync_source NOT NULL,
  status public.sync_status NOT NULL,
  items_upserted INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.sync_runs TO authenticated;
GRANT ALL ON public.sync_runs TO service_role;
ALTER TABLE public.sync_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sync_runs admin read" ON public.sync_runs FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- FX rates cache
CREATE TABLE IF NOT EXISTS public.fx_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  base TEXT NOT NULL,
  quote TEXT NOT NULL,
  rate NUMERIC(14,6) NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(base, quote)
);
GRANT SELECT ON public.fx_rates TO authenticated, anon;
GRANT ALL ON public.fx_rates TO service_role;
ALTER TABLE public.fx_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fx_rates public read" ON public.fx_rates FOR SELECT TO authenticated, anon USING (true);

-- M-Pesa payment attempts (extends existing payments concept)
CREATE TABLE IF NOT EXISTS public.mpesa_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  amount_kes INTEGER NOT NULL,
  checkout_request_id TEXT UNIQUE,
  merchant_request_id TEXT,
  mpesa_receipt TEXT,
  result_code INTEGER,
  result_desc TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  raw_callback JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.mpesa_transactions TO authenticated;
GRANT ALL ON public.mpesa_transactions TO service_role;
ALTER TABLE public.mpesa_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mpesa select own" ON public.mpesa_transactions FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "mpesa insert own" ON public.mpesa_transactions
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND b.guest_id = auth.uid()));
CREATE TRIGGER mpesa_transactions_touch BEFORE UPDATE ON public.mpesa_transactions FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Admin-scoped policies on existing tables so admin dashboard can read everything
CREATE POLICY "bookings admin read all" ON public.bookings FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "properties admin read all" ON public.properties FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "profiles admin read all" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "payments admin read all" ON public.payments FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
