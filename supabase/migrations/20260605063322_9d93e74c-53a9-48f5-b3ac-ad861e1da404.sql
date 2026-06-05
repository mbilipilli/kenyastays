DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookings_guest_id_fkey') THEN
    ALTER TABLE public.bookings ADD CONSTRAINT bookings_guest_id_fkey FOREIGN KEY (guest_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookings_host_id_fkey') THEN
    ALTER TABLE public.bookings ADD CONSTRAINT bookings_host_id_fkey FOREIGN KEY (host_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookings_property_id_fkey') THEN
    ALTER TABLE public.bookings ADD CONSTRAINT bookings_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reviews_guest_id_fkey') THEN
    ALTER TABLE public.reviews ADD CONSTRAINT reviews_guest_id_fkey FOREIGN KEY (guest_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reviews_property_id_fkey') THEN
    ALTER TABLE public.reviews ADD CONSTRAINT reviews_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'property_images_property_id_fkey') THEN
    ALTER TABLE public.property_images ADD CONSTRAINT property_images_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payments_booking_id_fkey') THEN
    ALTER TABLE public.payments ADD CONSTRAINT payments_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payments_user_id_fkey') THEN
    ALTER TABLE public.payments ADD CONSTRAINT payments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'properties_host_id_fkey') THEN
    ALTER TABLE public.properties ADD CONSTRAINT properties_host_id_fkey FOREIGN KEY (host_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;
NOTIFY pgrst, 'reload schema';