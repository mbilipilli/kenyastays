
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS subtotal_kes integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS service_fee_kes integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cleaning_fee_kes integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS commission_kes integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS host_payout_kes integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS affiliate_code text,
  ADD COLUMN IF NOT EXISTS affiliate_commission_kes integer NOT NULL DEFAULT 0;

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS featured_until timestamptz,
  ADD COLUMN IF NOT EXISTS cleaning_partner_id uuid,
  ADD COLUMN IF NOT EXISTS cleaning_fee_kes integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.cleaning_partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  city text NOT NULL,
  contact_phone text,
  contact_email text,
  platform_cut_pct numeric(5,2) NOT NULL DEFAULT 15.00,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.cleaning_partners TO authenticated;
GRANT ALL ON public.cleaning_partners TO service_role;
ALTER TABLE public.cleaning_partners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone signed in can view active cleaning partners"
  ON public.cleaning_partners FOR SELECT TO authenticated USING (is_active = true OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage cleaning partners"
  ON public.cleaning_partners FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER cleaning_partners_touch BEFORE UPDATE ON public.cleaning_partners
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.properties
  ADD CONSTRAINT properties_cleaning_partner_fkey FOREIGN KEY (cleaning_partner_id)
  REFERENCES public.cleaning_partners(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.featured_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan text NOT NULL CHECK (plan IN ('featured_stay','homepage_highlight')),
  monthly_price_kes integer NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','cancelled','past_due')),
  started_at timestamptz NOT NULL DEFAULT now(),
  current_period_end timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.featured_subscriptions TO authenticated;
GRANT ALL ON public.featured_subscriptions TO service_role;
ALTER TABLE public.featured_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Hosts view their subscriptions"
  ON public.featured_subscriptions FOR SELECT TO authenticated
  USING (profile_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Hosts create their subscriptions"
  ON public.featured_subscriptions FOR INSERT TO authenticated
  WITH CHECK (profile_id = auth.uid());
CREATE POLICY "Hosts update their subscriptions"
  ON public.featured_subscriptions FOR UPDATE TO authenticated
  USING (profile_id = auth.uid()) WITH CHECK (profile_id = auth.uid());
CREATE POLICY "Admins manage all subscriptions"
  ON public.featured_subscriptions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER featured_subs_touch BEFORE UPDATE ON public.featured_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.affiliates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  email text,
  commission_pct numeric(5,2) NOT NULL DEFAULT 5.00,
  is_active boolean NOT NULL DEFAULT true,
  total_earned_kes integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.affiliates TO anon, authenticated;
GRANT ALL ON public.affiliates TO service_role;
ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can look up active affiliates"
  ON public.affiliates FOR SELECT USING (is_active = true);
CREATE POLICY "Affiliate owners view own record"
  ON public.affiliates FOR SELECT TO authenticated
  USING (profile_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage affiliates"
  ON public.affiliates FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER affiliates_touch BEFORE UPDATE ON public.affiliates
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.affiliate_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  booking_id uuid NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE CASCADE,
  commission_kes integer NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','void')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.affiliate_referrals TO authenticated;
GRANT ALL ON public.affiliate_referrals TO service_role;
ALTER TABLE public.affiliate_referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Affiliates view their referrals"
  ON public.affiliate_referrals FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.affiliates a WHERE a.id = affiliate_id AND a.profile_id = auth.uid())
         OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage referrals"
  ON public.affiliate_referrals FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER affiliate_referrals_touch BEFORE UPDATE ON public.affiliate_referrals
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.bookings_guard_update()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE uid uuid := auth.uid();
BEGIN
  IF NEW.property_id IS DISTINCT FROM OLD.property_id
     OR NEW.guest_id    IS DISTINCT FROM OLD.guest_id
     OR NEW.host_id     IS DISTINCT FROM OLD.host_id
     OR NEW."profileId" IS DISTINCT FROM OLD."profileId"
     OR NEW.total_kes   IS DISTINCT FROM OLD.total_kes
     OR NEW.subtotal_kes IS DISTINCT FROM OLD.subtotal_kes
     OR NEW.service_fee_kes IS DISTINCT FROM OLD.service_fee_kes
     OR NEW.cleaning_fee_kes IS DISTINCT FROM OLD.cleaning_fee_kes
     OR NEW.commission_kes IS DISTINCT FROM OLD.commission_kes
     OR NEW.host_payout_kes IS DISTINCT FROM OLD.host_payout_kes
     OR NEW.affiliate_code IS DISTINCT FROM OLD.affiliate_code
     OR NEW.affiliate_commission_kes IS DISTINCT FROM OLD.affiliate_commission_kes
     OR NEW.nights      IS DISTINCT FROM OLD.nights
     OR NEW.check_in    IS DISTINCT FROM OLD.check_in
     OR NEW.check_out   IS DISTINCT FROM OLD.check_out
     OR NEW.guests      IS DISTINCT FROM OLD.guests
     OR NEW.created_at  IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION 'These booking fields cannot be modified';
  END IF;

  IF uid = OLD.guest_id AND uid <> OLD.host_id THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'Guests cannot change booking status';
    END IF;
  ELSIF uid = OLD.host_id AND uid <> OLD.guest_id THEN
    IF NEW.notes IS DISTINCT FROM OLD.notes THEN
      RAISE EXCEPTION 'Hosts cannot change guest notes';
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status
       AND NEW.status::text NOT IN ('confirmed','cancelled','completed') THEN
      RAISE EXCEPTION 'Invalid status transition';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
