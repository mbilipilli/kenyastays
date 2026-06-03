
-- Enums
CREATE TYPE public.app_role AS ENUM ('guest','host','admin');
CREATE TYPE public.property_type AS ENUM ('apartment','lodge','homestay','guest_house','villa','cottage');
CREATE TYPE public.booking_status AS ENUM ('pending','confirmed','cancelled','completed');
CREATE TYPE public.payment_method AS ENUM ('mpesa','card');
CREATE TYPE public.payment_status AS ENUM ('initiated','pending','success','failed');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  bio TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles select all" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles insert self" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "profiles update self" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());

-- User roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT, INSERT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "roles select self" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "roles insert self" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND role IN ('guest','host'));

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Auto-create profile + default guest role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_user_meta_data->>'phone'
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'guest') ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at helper
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

-- Properties
CREATE TABLE public.properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  property_type public.property_type NOT NULL DEFAULT 'apartment',
  city TEXT NOT NULL,
  address TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  price_kes INTEGER NOT NULL CHECK (price_kes >= 0),
  max_guests INTEGER NOT NULL DEFAULT 2 CHECK (max_guests > 0),
  bedrooms INTEGER NOT NULL DEFAULT 1 CHECK (bedrooms >= 0),
  bathrooms INTEGER NOT NULL DEFAULT 1 CHECK (bathrooms >= 0),
  amenities TEXT[] NOT NULL DEFAULT '{}',
  landmarks TEXT[] NOT NULL DEFAULT '{}',
  is_eco BOOLEAN NOT NULL DEFAULT false,
  is_community BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  cover_image TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX properties_city_idx ON public.properties(city);
CREATE INDEX properties_host_idx ON public.properties(host_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.properties TO authenticated;
GRANT SELECT ON public.properties TO anon;
GRANT ALL ON public.properties TO service_role;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "properties public read" ON public.properties FOR SELECT USING (is_active OR host_id = auth.uid());
CREATE POLICY "properties host insert" ON public.properties FOR INSERT TO authenticated WITH CHECK (host_id = auth.uid());
CREATE POLICY "properties host update" ON public.properties FOR UPDATE TO authenticated USING (host_id = auth.uid());
CREATE POLICY "properties host delete" ON public.properties FOR DELETE TO authenticated USING (host_id = auth.uid());
CREATE TRIGGER properties_touch BEFORE UPDATE ON public.properties FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Property images
CREATE TABLE public.property_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX property_images_property_idx ON public.property_images(property_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.property_images TO authenticated;
GRANT SELECT ON public.property_images TO anon;
GRANT ALL ON public.property_images TO service_role;
ALTER TABLE public.property_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "images public read" ON public.property_images FOR SELECT USING (true);
CREATE POLICY "images host write" ON public.property_images FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND p.host_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_id AND p.host_id = auth.uid()));

-- Bookings
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  guest_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  host_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  guests INTEGER NOT NULL DEFAULT 1 CHECK (guests > 0),
  nights INTEGER NOT NULL CHECK (nights > 0),
  total_kes INTEGER NOT NULL CHECK (total_kes >= 0),
  status public.booking_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (check_out > check_in)
);
CREATE INDEX bookings_property_idx ON public.bookings(property_id);
CREATE INDEX bookings_guest_idx ON public.bookings(guest_id);
CREATE INDEX bookings_host_idx ON public.bookings(host_id);
GRANT SELECT, INSERT, UPDATE ON public.bookings TO authenticated;
GRANT ALL ON public.bookings TO service_role;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bookings read participant" ON public.bookings FOR SELECT TO authenticated
  USING (guest_id = auth.uid() OR host_id = auth.uid());
CREATE POLICY "bookings insert guest" ON public.bookings FOR INSERT TO authenticated
  WITH CHECK (guest_id = auth.uid());
CREATE POLICY "bookings update participant" ON public.bookings FOR UPDATE TO authenticated
  USING (guest_id = auth.uid() OR host_id = auth.uid());
CREATE TRIGGER bookings_touch BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Reviews
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  guest_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (property_id, guest_id)
);
CREATE INDEX reviews_property_idx ON public.reviews(property_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT SELECT ON public.reviews TO anon;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reviews public read" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "reviews insert own" ON public.reviews FOR INSERT TO authenticated WITH CHECK (guest_id = auth.uid());
CREATE POLICY "reviews update own" ON public.reviews FOR UPDATE TO authenticated USING (guest_id = auth.uid());
CREATE POLICY "reviews delete own" ON public.reviews FOR DELETE TO authenticated USING (guest_id = auth.uid());

-- Payments
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  method public.payment_method NOT NULL,
  amount_kes INTEGER NOT NULL CHECK (amount_kes > 0),
  status public.payment_status NOT NULL DEFAULT 'initiated',
  provider_ref TEXT,
  phone TEXT,
  raw JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX payments_booking_idx ON public.payments(booking_id);
GRANT SELECT, INSERT, UPDATE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payments read own" ON public.payments FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "payments insert own" ON public.payments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE TRIGGER payments_touch BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
