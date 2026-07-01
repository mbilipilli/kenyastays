-- 1. Bookings: remove broad guest UPDATE policy. Trigger already blocks guests from
-- changing status/financials; keep hosts able to update. Guest cancellations must
-- now go through a privileged server function.
DROP POLICY IF EXISTS "bookings update guest" ON public.bookings;

-- 2. Payments: verify booking ownership on insert.
DROP POLICY IF EXISTS "payments insert own" ON public.payments;
CREATE POLICY "payments insert own" ON public.payments
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = payments.booking_id AND b.guest_id = auth.uid()
    )
  );

-- 3. Profiles: restrict reads to self or a booking counterparty so phone numbers
-- aren't exposed to every authenticated user.
DROP POLICY IF EXISTS "profiles select authenticated" ON public.profiles;
CREATE POLICY "profiles select self or booking counterparty" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE (b.guest_id = auth.uid() AND b.host_id = profiles.id)
         OR (b.host_id  = auth.uid() AND b.guest_id = profiles.id)
    )
  );