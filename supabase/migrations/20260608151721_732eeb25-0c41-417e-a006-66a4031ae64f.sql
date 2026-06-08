-- 1) Restrict profiles SELECT to authenticated users
DROP POLICY IF EXISTS "profiles select all" ON public.profiles;
CREATE POLICY "profiles select authenticated"
  ON public.profiles FOR SELECT TO authenticated USING (true);

-- 2) Restrict bookings UPDATE per role + guard immutable/sensitive columns
DROP POLICY IF EXISTS "bookings update participant" ON public.bookings;

CREATE POLICY "bookings update guest"
  ON public.bookings FOR UPDATE TO authenticated
  USING (guest_id = auth.uid())
  WITH CHECK (guest_id = auth.uid());

CREATE POLICY "bookings update host"
  ON public.bookings FOR UPDATE TO authenticated
  USING (host_id = auth.uid())
  WITH CHECK (host_id = auth.uid());

CREATE OR REPLACE FUNCTION public.bookings_guard_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid();
BEGIN
  IF NEW.property_id IS DISTINCT FROM OLD.property_id
     OR NEW.guest_id    IS DISTINCT FROM OLD.guest_id
     OR NEW.host_id     IS DISTINCT FROM OLD.host_id
     OR NEW."profileId" IS DISTINCT FROM OLD."profileId"
     OR NEW.total_kes   IS DISTINCT FROM OLD.total_kes
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
$$;

DROP TRIGGER IF EXISTS bookings_guard_update_trg ON public.bookings;
CREATE TRIGGER bookings_guard_update_trg
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.bookings_guard_update();

-- 3) Reviews require a completed booking for the same guest+property
DROP POLICY IF EXISTS "reviews insert own" ON public.reviews;
CREATE POLICY "reviews insert verified"
  ON public.reviews FOR INSERT TO authenticated
  WITH CHECK (
    guest_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.guest_id = auth.uid()
        AND b.property_id = reviews.property_id
        AND b.status = 'completed'
    )
  );

-- 4) Lock down SECURITY DEFINER functions from API roles
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bookings_guard_update() FROM PUBLIC, anon, authenticated;