-- Anonymous visitors: column-limited read on properties (no address / exact coordinates)
REVOKE SELECT ON public.properties FROM anon;
GRANT SELECT (
  id, title, description, property_type, city,
  price_kes, max_guests, bedrooms, bathrooms,
  amenities, landmarks, is_eco, is_community, is_active,
  cover_image, is_featured, featured_until, cleaning_fee_kes,
  created_at, updated_at
) ON public.properties TO anon;

-- Photo rows expose raw storage paths that embed host user IDs.
-- Images are served through signed URLs generated server-side, so anon
-- has no need to read this table directly.
REVOKE SELECT ON public.property_images FROM anon;

DROP POLICY IF EXISTS "images public read" ON public.property_images;
CREATE POLICY "images readable by authenticated users"
ON public.property_images FOR SELECT TO authenticated
USING (true);